"""create_medical_reports_storage_bucket

Create Supabase Storage bucket and policies for medical report uploads.

Revision ID: c7e8f9a0b1c2
Revises: b1c2d3e4f5a6
Create Date: 2026-03-12 17:30:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c7e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a private bucket for report files.
    op.execute(
        """
        insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values (
          'medical-reports',
          'medical-reports',
          false,
          26214400,
          array[
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/tiff',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]::text[]
        )
        on conflict (id) do update set
          public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
        """
    )

    # Grant minimal path-scoped access for backend keys that map to anon/authenticated.
    op.execute(
        """
        do $$
        begin
          if not exists (
            select 1 from pg_policies
            where schemaname = 'storage'
              and tablename = 'objects'
              and policyname = 'medical_reports_anon_insert'
          ) then
            create policy medical_reports_anon_insert
              on storage.objects
              for insert
              to anon
              with check (
                bucket_id = 'medical-reports'
                and name like 'reports/%'
              );
          end if;
        end $$;
        """
    )

    op.execute(
        """
        do $$
        begin
          if not exists (
            select 1 from pg_policies
            where schemaname = 'storage'
              and tablename = 'objects'
              and policyname = 'medical_reports_anon_select'
          ) then
            create policy medical_reports_anon_select
              on storage.objects
              for select
              to anon
              using (
                bucket_id = 'medical-reports'
                and name like 'reports/%'
              );
          end if;
        end $$;
        """
    )

    op.execute(
        """
        do $$
        begin
          if not exists (
            select 1 from pg_policies
            where schemaname = 'storage'
              and tablename = 'objects'
              and policyname = 'medical_reports_anon_delete'
          ) then
            create policy medical_reports_anon_delete
              on storage.objects
              for delete
              to anon
              using (
                bucket_id = 'medical-reports'
                and name like 'reports/%'
              );
          end if;
        end $$;
        """
    )


def downgrade() -> None:
  # Keep downgrade non-destructive: do not delete the bucket or objects.
  # This prevents accidental data loss in shared or long-lived environments.
    op.execute("drop policy if exists medical_reports_anon_delete on storage.objects;")
    op.execute("drop policy if exists medical_reports_anon_select on storage.objects;")
    op.execute("drop policy if exists medical_reports_anon_insert on storage.objects;")
