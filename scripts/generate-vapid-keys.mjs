import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const privateJwk = privateKey.export({ format: "jwk" });
const publicJwk = publicKey.export({ format: "jwk" });
const decode = (value) => Buffer.from(value, "base64url");
const applicationServerKey = Buffer.concat([
  Buffer.from([4]),
  decode(publicJwk.x),
  decode(publicJwk.y),
]).toString("base64url");

console.log("Copy these values into your DayFlow configuration:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${applicationServerKey}\n`);
console.log("VAPID_KEYS=");
console.log(JSON.stringify({ publicKey: publicJwk, privateKey: privateJwk }));
