defmodule ZenServer.Firebase do
  @fcm_url "https://fcm.googleapis.com/v1/projects"

  def send_push(user_id, token, title, body, data \\ %{}) do
    with key_b64 when is_binary(key_b64) <- Application.get_env(:zen_server, :firebase)[:service_account_key],
         {:ok, service_account} <- key_b64 |> Base.decode64!() |> Jason.decode(),
         {:ok, access_token} <- get_access_token(service_account) do
      project_id = service_account["project_id"]
      string_data = Enum.into(data, %{}, fn {k, v} -> {to_string(k), to_string(v)} end)

      payload = %{
        message: %{
          token: token,
          notification: %{title: title, body: body},
          data: string_data,
          android: %{priority: "high"},
          apns: %{headers: %{"apns-priority" => "10"}},
          webpush: %{
            headers: %{"Urgency" => "high"},
            notification: %{
              title: title,
              body: body,
              icon: "/favicon.svg",
              badge: "/favicon.svg",
              tag: "zenchat-notif",
              renotify: true
            }
          }
        }
      }

      url = "#{@fcm_url}/#{project_id}/messages:send"

      case Finch.build(:post, url,
        [
          {"authorization", "Bearer #{access_token}"},
          {"content-type", "application/json"}
        ],
        Jason.encode!(payload)
      ) |> Finch.request(ZenServer.Finch) do
        {:ok, %{status: 200}} ->
          true
        {:ok, %{status: 404}} ->
          cleanup_token(user_id, token)
          false
        _ -> false
      end
    else
      _ -> false
    end
  end

  defp get_access_token(service_account) do
    now = System.system_time(:second)
    claim = %{
      "iss" => service_account["client_email"],
      "scope" => "https://www.googleapis.com/auth/firebase.messaging",
      "aud" => service_account["token_uri"],
      "iat" => now,
      "exp" => now + 3600
    }

    private_key_pem = service_account["private_key"]
      |> String.replace("\\n", "\n")

    signer = Joken.Signer.create("RS256", %{"pem" => private_key_pem})
    with {:ok, jwt, _} <- Joken.encode_and_sign(claim, signer) do
      body = "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=#{jwt}"
      case Finch.build(:post, service_account["token_uri"],
        [{"content-type", "application/x-www-form-urlencoded"}],
        body
      ) |> Finch.request(ZenServer.Finch) do
        {:ok, %{status: 200, body: resp}} ->
          {:ok, resp |> Jason.decode!() |> Map.get("access_token")}
        _ -> {:error, :token_fetch_failed}
      end
    end
  end

  defp cleanup_token(_user_id, _token) do
    :ok
  end
end
