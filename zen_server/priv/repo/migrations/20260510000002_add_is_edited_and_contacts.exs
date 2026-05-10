defmodule ZenServer.Repo.Migrations.AddIsEditedAndContacts do
  use Ecto.Migration

  def change do
    alter table(:messages) do
      add :is_edited, :boolean, default: false
    end

    create table(:user_contacts, primary_key: false) do
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :contact_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
    end

    create unique_index(:user_contacts, [:user_id, :contact_id])
  end
end
