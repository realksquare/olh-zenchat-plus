defmodule ZenServer.ChatChannel do
  use Phoenix.Channel
  alias ZenServer.Repo
  alias ZenServer.Schema.{Chat, ChatParticipant}
  import Ecto.Query

  def join("chat:" <> chat_id, _payload, socket) do
    user_id = socket.assigns.user_id

    # Verify user is a participant
    is_participant =
      from(cp in ChatParticipant,
        where: cp.chat_id == ^chat_id and cp.user_id == ^user_id
      )
      |> Repo.exists?()

    if is_participant do
      {:ok, socket}
    else
      {:error, %{reason: "not found"}}
    end
  end
end
