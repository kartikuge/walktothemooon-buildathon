import type { City, MapGeometry } from "@workspace/api-zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const cityCache = new Map<number, City>();
const searchCache = new Map<string, { expires: number; cities: City[] }>();
const routeCache = new Map<string, { expires: number; result: GeoPreview }>();
const TTL = 24 * 60 * 60 * 1000;
let nextRequest = Promise.resolve();
let lastRequestAt = 0;

// A single application queue protects these public demo services from bursts.
async function remoteJson(url: URL): Promise<any> {
  const previous = nextRequest;
  let release!: () => void;
  nextRequest = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - lastRequestAt))));
    lastRequestAt = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "RunToTheMoon/1.0 (virtual running challenge demo)", Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new HttpError(503, "The map service is temporarily unavailable. Please try again.");
    }
    if (response.status === 429) throw new HttpError(503, "The map service is busy. Please wait a moment and try again.");
    let data: any;
    try { data = await response.json(); }
    catch { throw new HttpError(503, "The map service returned an unreadable response. Please try again."); }
    if (!response.ok) {
      if (url.hostname.includes("valhalla") && response.status === 400) {
        throw new HttpError(422, "No walking route is available for these cities within this service's coverage or distance limits. Choose closer cities or explicitly select Virtual distance.");
      }
      throw new HttpError(503, "The map service could not complete this request. Please try again.");
    }
    return data;
  } finally { release(); }
}

function asCity(data: any): City {
  if (!Number.isInteger(data?.id) || typeof data?.name !== "string" ||
      !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude) ||
      Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) {
    throw new HttpError(503, "The city service returned invalid coordinates.");
  }
  const city: City = {
    id: data.id, name: data.name,
    label: [...new Set([data.name, data.admin1, data.country].filter(Boolean))].join(", "),
    latitude: data.latitude, longitude: data.longitude,
  };
  if (cityCache.size > 2000) cityCache.clear();
  cityCache.set(city.id, city);
  return city;
}

export async function searchCities(query: string): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > 100) throw new HttpError(400, "Enter a city name between 2 and 100 characters.");
  const key = q.toLowerCase();
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.cities;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: q, count: "8", language: "en", format: "json" }).toString();
  const data = await remoteJson(url);
  const cities = Array.isArray(data.results) ? data.results.map(asCity) : [];
  if (searchCache.size > 500) searchCache.clear();
  searchCache.set(key, { expires: Date.now() + TTL, cities });
  return cities;
}

export async function resolveCity(id: number): Promise<City> {
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Select a city from the search results.");
  const cached = cityCache.get(id);
  if (cached) return cached;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/get");
  url.searchParams.set("id", String(id));
  const data = await remoteJson(url);
  if (!data?.id) throw new HttpError(404, "City not found. Search and select the city again.");
  return asCity(data);
}

const radians = (n: number) => n * Math.PI / 180;
export function directMiles(a: Pick<City,"latitude"|"longitude">, b: Pick<City,"latitude"|"longitude">): number {
  const dlat = radians(b.latitude - a.latitude), dlon = radians(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(Math.max(0, h)), Math.sqrt(Math.max(0, 1 - h)));
}

/** Great-circle sampling with unwrapped longitudes so dateline crossings stay short. */
export function virtualCoordinates(a: City, b: City): number[][] {
  const vector = (city: City) => {
    const lat = radians(city.latitude), lon = radians(city.longitude);
    return [Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat)];
  };
  const av=vector(a), bv=vector(b);
  const dot = Math.max(-1,Math.min(1,av.reduce((s,n,i)=>s+n*bv[i],0)));
  const angle = Math.acos(dot);
  if (angle < 1e-8) return [[a.latitude,a.longitude],[b.latitude,b.longitude]];
  let tangent = bv.map((n,i)=>n-dot*av[i]);
  let length = Math.hypot(...tangent);
  if (length < 1e-8) {
    const axis = Math.abs(av[0]) < 0.8 ? [1,0,0] : [0,1,0];
    const projection = av.reduce((s,n,i)=>s+n*axis[i],0);
    tangent = axis.map((n,i)=>n-projection*av[i]);
    length = Math.hypot(...tangent);
  }
  tangent = tangent.map(n=>n/length);
  let previous = a.longitude;
  return Array.from({length:129},(_,i)=>{
    const theta = angle*i/128;
    const v = av.map((n,j)=>n*Math.cos(theta)+tangent[j]*Math.sin(theta));
    const lat = Math.atan2(v[2],Math.hypot(v[0],v[1]))*180/Math.PI;
    let lon = Math.atan2(v[1],v[0])*180/Math.PI;
    while(lon-previous>180) lon-=360;
    while(lon-previous< -180) lon+=360;
    previous=lon;
    return [lat,lon];
  });
}

export function decodePolyline6(shape: string): number[][] {
  const points:number[][]=[];
  let index=0,lat=0,lon=0;
  function component() {
    let result=0,shift=0,byte=0;
    do {
      if(index>=shape.length || shift>30) throw new HttpError(503,"Walking route geometry was invalid.");
      byte=shape.charCodeAt(index++)-63;
      if(byte<0 || byte>63) throw new HttpError(503,"Walking route geometry was invalid.");
      result|=(byte&31)<<shift; shift+=5;
    } while(byte>=32);
    return (result&1)?~(result>>1):(result>>1);
  }
  while(index<shape.length) {
    lat+=component(); lon+=component();
    points.push([lat/1e6,lon/1e6]);
    if(points.length>100000) throw new HttpError(422,"This walking route is too large to display. Try closer cities.");
  }
  return points;
}

export type GeoPreview = { name: string; totalMiles: number; geometry: MapGeometry };

export async function buildGeoPreview(originId: number, destinationId: number, mode: "virtual"|"walking"): Promise<GeoPreview> {
  if (mode !== "virtual" && mode !== "walking") throw new HttpError(400,"Choose Virtual distance or Walking route.");
  if (originId === destinationId) throw new HttpError(400,"Choose two different cities.");
  const key = `${originId}:${destinationId}:${mode}`;
  const cached = routeCache.get(key);
  if(cached && cached.expires>Date.now()) return cached.result;
  const [origin,destination]=await Promise.all([resolveCity(originId),resolveCity(destinationId)]);
  const direct=directMiles(origin,destination);
  if(direct<0.01) throw new HttpError(400,"Choose two different cities.");
  let totalMiles=direct, coordinates=virtualCoordinates(origin,destination);
  let description = "Virtual great-circle distance between city centers. A shared fitness challenge, not a physical walking route; it may cross oceans.";
  let attribution = "City data: GeoNames via Open-Meteo. Virtual geographic distance.";
  if(mode==="walking") {
    const url=new URL("https://valhalla1.openstreetmap.de/route");
    url.searchParams.set("json",JSON.stringify({
      locations:[{lat:origin.latitude,lon:origin.longitude},{lat:destination.latitude,lon:destination.longitude}],
      costing:"pedestrian", units:"miles", directions_type:"none",
      costing_options:{pedestrian:{use_ferry:0}},
    }));
    const data=await remoteJson(url);
    if(data.trip?.status!==0 || !Number.isFinite(data.trip?.summary?.length) || data.trip.summary.length<=0 || !Array.isArray(data.trip.legs)) {
      throw new HttpError(422,"No walking route could be found. Try closer cities or explicitly select Virtual distance.");
    }
    if(data.trip.summary.has_ferry || data.trip.legs.some((leg:any)=>leg.summary?.has_ferry)) {
      throw new HttpError(422,"This route requires a ferry, so it is not a continuous walking route. Choose Virtual distance instead.");
    }
    totalMiles=data.trip.summary.length;
    coordinates=data.trip.legs.flatMap((leg:any)=>{
      if(typeof leg.shape!=="string") throw new HttpError(503,"Walking route geometry was not provided.");
      return decodePolyline6(leg.shape);
    });
    if(coordinates.length<2) throw new HttpError(503,"Walking route geometry was not provided.");
    description = "Pedestrian route between city centers, calculated from OpenStreetMap. Distance is an estimate; check local access and safety before walking.";
    attribution = "Routing: Valhalla / FOSSGIS. © OpenStreetMap contributors. Cities: GeoNames via Open-Meteo.";
  }
  const result:GeoPreview = {
    name:`${origin.name} to ${destination.name}`,
    totalMiles: Math.round(totalMiles*100)/100,
    geometry:{mode,origin,destination,coordinates,description,attribution},
  };
  if(routeCache.size>200) routeCache.clear();
  routeCache.set(key,{expires:Date.now()+TTL,result});
  return result;
}