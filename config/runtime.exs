import Config

config :zen_server, ZenServer.Endpoint,
  secret_key_base: System.fetch_env!("SECRET_KEY_BASE")

config :zen_server, ZenServer.Guardian,
  secret_key: System.get_env("JWT_SECRET", "fallback_secret_change_in_prod_32chars"),
  allowed_algos: ["HS256"]

config :zen_server, ZenServer.Repo,
  url: System.fetch_env!("DATABASE_URL"),
  ssl: true,
  ssl_opts: [verify: :verify_none],
  pool_size: String.to_integer(System.get_env("POOL_SIZE", "1"))

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
  System.get_env("CLIENT_URL", "http://localhost:5173"),
  "https://olh-zenchat.vercel.app",
  "https://olh-zenchat.onrender.com"
]
