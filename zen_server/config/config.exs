import Config

config :zen_server,
  ecto_repos: [ZenServer.Repo]

config :zen_server, ZenServer.Endpoint,
  http: [port: 4000],
  secret_key_base: System.get_env("SECRET_KEY_BASE") || "CHANGE_ME_IN_PROD_USE_MIX_PHEX_GEN_SECRET",
  server: true

config :zen_server, ZenServer.Guardian,
  issuer: "zen_server",
  secret_key: System.get_env("JWT_SECRET") || "fallback_secret_change_in_prod_32chars",
  ttl: {7, :day},
  allowed_algos: ["HS256"]

config :zen_server, ZenServer.Repo,
  adapter: Ecto.Adapters.Postgres,
  pool_size: 10

config :zen_server, :cloudinary,
  cloud_name: System.get_env("CLOUDINARY_CLOUD_NAME"),
  api_key: System.get_env("CLOUDINARY_API_KEY"),
  api_secret: System.get_env("CLOUDINARY_API_SECRET")

config :zen_server, :spotify,
  client_id: System.get_env("SPOTIFY_CLIENT_ID"),
  client_secret: System.get_env("SPOTIFY_CLIENT_SECRET")

config :zen_server, :firebase,
  service_account_key: System.get_env("FIREBASE_SERVICE_ACCOUNT_KEY")

config :zen_server, :allowed_origins, [
  System.get_env("CLIENT_URL") || "http://localhost:5173",
  "https://olh-zenchat.vercel.app",
  "https://olh-zenchat.onrender.com"
]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

import_config "#{config_env()}.exs"
