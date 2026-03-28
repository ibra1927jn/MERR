import { userService } from '../user.service';

/**
 * Procesa items de sync tipo UNLINK — desvincula usuario del orchard en Supabase.
 */
export async function processUnlink(payload: { userId: string }): Promise<void> {
  if (!payload.userId) {
    throw new Error('UNLINK payload missing userId');
  }
  await userService.unassignUserFromOrchard(payload.userId);
}
