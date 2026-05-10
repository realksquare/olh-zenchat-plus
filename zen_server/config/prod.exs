import Config

config :zen_server, ZenServer.Endpoint,
  server: true,
  check_origin: false # Set to false to allow mobile app connections, or list your production domains

config :logger, level: :info
