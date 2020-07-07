import { UserRole } from '../auth/user-role.enum';
import { ProgramPhase } from './program.model';

export enum BulkActionId {
  chooseAction = 'choose-action',
  selectForValidation = 'select-for-validation',
  includeProjectOfficer = 'include-project-officer',
  includeProgramManager = 'include-program-manager',
}

export class BulkAction {
  id: BulkActionId;
  enabled: boolean;
  label: string;
  roles: UserRole[];
  phases: ProgramPhase[];
}
