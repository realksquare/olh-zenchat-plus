defmodule ZenServer.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      ZenServer.Repo,
      {Finch, name: ZenServer.Finch},
      ZenServer.Presence,
      {Phoenix.PubSub, name: ZenServer.PubSub},
      ZenServer.Endpoint
    ]

    opts = [strategy: :one_for_one, name: ZenServer.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
