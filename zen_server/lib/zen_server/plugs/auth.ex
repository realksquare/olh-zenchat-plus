defmodule ZenServer.Plugs.Auth do
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- ZenServer.Guardian.decode_and_verify(token),
         {:ok, user} <- ZenServer.Guardian.resource_from_claims(claims) do
      conn
      |> assign(:current_user, user)
      |> assign(:current_user_id, user.id)
    else
      _ ->
        conn
        |> put_status(401)
        |> json(%{message: "Unauthorized"})
        |> halt()
    end
  end
end
