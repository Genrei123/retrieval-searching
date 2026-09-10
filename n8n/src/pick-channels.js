// Fans out into one item per YouTube channel, so the HTTP Request node after this runs
// once per feed. Atom feeds are public and need no API key, which is the whole reason the
// watch tile works without another credential to keep alive.
//
// Edit this list to change what shows up on the homepage. A channel id is the `UC...`
// string in https://www.youtube.com/channel/<id>; a wrong one simply yields no entries
// rather than an error.
const CHANNELS = [
  'UCsBjURrPoezykLs9EqgamOA', // Fireship
  'UCbRP3c757lWg9M-U7TyEkXA', // Theo - t3.gg
  'UCZgt6AzoyjslHTC9dz0UoTw', // ByteByteGo
  'UCFbNIlppjAuEX4znoulh0Cw', // Web Dev Simplified
  'UCLq8gNoee7oXM7MvTdjyQvA', // Vercel
];

return CHANNELS.map((channelId) => ({
  json: { feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}` },
}));
