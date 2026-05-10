defmodule ZenServer.UserSocket do
  use Phoenix.Socket

  channel "user:*", ZenServer.UserChannel
  channel "chat:*", ZenServer.ChatChannel

  @impl true
  def connect(%{"token" => token} = params, socket, _connect_info) do
    case ZenServer.Guardian.decode_and_verify(token) do
      {:ok, claims} ->
        case ZenServer.Guardian.resource_from_claims(claims) do
          {:ok, user} ->
            device_type = Map.get(params, "deviceType", "app")
            {:ok,
              socket
              |> assign(:current_user, user)
              |> assign(:user_id, user.id)
              |> assign(:device_type, device_type)
            }
          _ -> :error
        end
      _ -> :error
    end
  end

  def connect(_, _, _), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"
end
