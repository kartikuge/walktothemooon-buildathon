import { test } from "node:test";
import assert from "node:assert/strict";
import { directMiles,virtualCoordinates,decodePolyline6 } from "./geo.ts";

const city=(latitude:number,longitude:number)=>({id:1,name:"Test",label:"Test",latitude,longitude});
test("direct geographic distance is symmetric and uses miles",()=>{
  const a=city(40.44,-79.99),b=city(41.89193,12.51133);
  const distance=directMiles(a,b);
  assert.ok(distance>4500&&distance<4600);
  assert.ok(Math.abs(distance-directMiles(b,a))<1e-8);
  assert.equal(directMiles(a,a),0);
});
test("virtual great circle keeps endpoints and unwraps the dateline",()=>{
  const points=virtualCoordinates(city(10,170),city(10,-170));
  assert.equal(points.length,129);
  assert.ok(Math.abs(points[0][1]-170)<1e-7);
  assert.ok(Math.abs(points[128][1]-190)<1e-7);
  assert.ok(points.every((p,i)=>i===0||Math.abs(p[1]-points[i-1][1])<180));
});
test("antipodal virtual journeys stay finite",()=>{
  assert.ok(virtualCoordinates(city(0,0),city(0,180)).flat().every(Number.isFinite));
});
test("polyline6 valid and malformed strings",()=>{
  assert.deepEqual(decodePolyline6("??AA"),[[0,0],[0.000001,0.000001]]);
  assert.throws(()=>decodePolyline6("?"));
});