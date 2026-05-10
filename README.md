# ZenChat Plus Backend

Welcome to the backend for ZenChat+. This is the engine that powers the React Native version of ZenChat. We decided to migrate from the MERN stack (Node.js and Socket.io) to Elixir and Phoenix to handle real-time chat at scale without breaking a sweat.

### How it links with Vanilla ZenChat

Vanilla ZenChat was built on the MERN stack. It worked well, but keeping real-time socket connections perfectly synced across unreliable mobile networks was a bit of a headache. 

ZenChat+ shares the exact same MongoDB database, the same authentication tokens (JWT), and the same external services (Cloudinary, Firebase, Spotify) as Vanilla ZenChat. We essentially swapped out the backend engine. If you switch between the web PWA (Vanilla) and the React Native app (Plus), you won't even notice the difference, except things will be noticeably faster and more stable.

### Features

* Built on Elixir and Phoenix framework
* Uses Phoenix Channels and Presence for highly concurrent, flawless real-time communication (preventing missing message bugs)
* Connects seamlessly with our existing MongoDB cluster using the Elixir MongoDB driver
* Push notifications via Firebase Cloud Messaging (FCM) using JWT OAuth2
* View-once media uploads powered by Cloudinary
* Full parity with existing REST controllers (Auth, Chat, Message, Moment, Admin, Music)
* Music integration handling both Deezer and iTunes APIs in parallel

### Running it locally

You will need Elixir and Erlang installed. Once you're set:

1. CD into the directory
2. Run "mix deps.get" to grab the dependencies
3. Run "mix phx.server" to fire it up

The API and WebSocket will listen on port 4000 instead of 5000. For the WebSocket, connect via "ws://localhost:4000/socket/websocket?token=<JWT>&deviceType=app".

### Environment Variables

Make sure you have a .env file with your Mongo URI, Cloudinary keys, Firebase Service Account, and Spotify credentials. We also need a SECRET_KEY_BASE for Phoenix to handle sessions securely.
