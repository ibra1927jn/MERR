import { pickerService } from './picker.service';
import { attendanceService } from './attendance.service';
import { userService } from './user.service';
import { settingsService } from './settings.service';

// LA FACHADA: Unimos todo en un solo objeto para compatibilidad
// The Facade: We merge everything into a single object for compatibility
export const databaseService = {
  ...pickerService,
  ...attendanceService,
  ...userService,
  ...settingsService,
};

// Re-export type if needed anywhere explicitly, though typically imported from ../types
// export interface RegisteredUser ... (Moved to user service if strictly needed, or kept in types)
export interface RegisteredUser {
  id: string;
  full_name: string;
  role: string;
  orchard_id?: string;
  email?: string;
}