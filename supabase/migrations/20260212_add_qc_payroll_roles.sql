-- Migration: Add qc_inspector and payroll_admin roles
-- Date: 2026-02-12
-- Description: Extends the user role options in the users table
--              to support Quality Control inspectors and Payroll admins.
-- Update the check constraint on users.role to include new roles
-- (Only needed if there's an existing CHECK constraint on the role column)
DO $$ BEGIN -- Drop existing constraint if it exists
IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'users'
        AND constraint_type = 'CHECK'
        AND constraint_name = 'users_role_check'
) THEN
ALTER TABLE users DROP CONSTRAINT users_role_check;
END IF;
-- Add updated constraint with new roles
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'manager',
            'team_leader',
            'runner',
            'qc_inspector',
            'payroll_admin'
        )
    );
RAISE NOTICE 'Role constraint updated: added qc_inspector, payroll_admin';
END $$;
-- Add comment for documentation
COMMENT ON COLUMN users.role IS 'User role: manager, team_leader, runner, qc_inspector, payroll_admin';