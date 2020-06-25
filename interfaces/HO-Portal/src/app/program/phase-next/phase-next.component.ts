import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ProgramsServiceApiService } from 'src/app/services/programs-service-api.service';
import { Program, ProgramPhase } from 'src/app/models/program.model';
import { UserRole } from 'src/app/auth/user-role.enum';
import { AuthService } from 'src/app/auth/auth.service';
import {
  ProgramPhaseService,
  Phase,
} from 'src/app/services/program-phase.service';

@Component({
  selector: 'app-phase-next',
  templateUrl: './phase-next.component.html',
  styleUrls: ['./phase-next.component.scss'],
})
export class PhaseNextComponent implements OnInit {
  @Input()
  public programId: number;
  @Input()
  public thisPhaseName: ProgramPhase;
  @Input()
  public phaseReady: boolean;

  private programPhases: Phase[];

  public program: Program;
  public activePhase: Phase;

  public btnAvailable: boolean;
  public btnText: string;
  public isInProgress = false;

  private currentUserRole: string;

  constructor(
    private programsService: ProgramsServiceApiService,
    private authService: AuthService,
    private programPhaseService: ProgramPhaseService,
  ) {}

  async ngOnInit() {
    this.currentUserRole = this.authService.getUserRole();
    this.programPhases = await this.programPhaseService.getPhases(
      this.programId,
    );
    this.updatePhases();
    this.btnAvailable = this.checkAvailable();
    this.btnText = this.fillBtnText();
  }

  private checkAvailable(): boolean {
    return this.thisPhaseName !== ProgramPhase.evaluation;
  }

  public checkDisabled(): boolean {
    return (
      this.thisPhaseName !== this.activePhase.name ||
      this.isInProgress ||
      // !this.phaseReady ||
      this.currentUserRole !== UserRole.ProjectOfficer
    );
  }

  private async updatePhases() {
    this.activePhase = this.programPhaseService.getActivePhase();
    this.btnText = this.activePhase.btnText;
    this.btnAvailable = this.isNotLastPhase();
  }

  private isNotLastPhase(): boolean {
    const phases = Object.keys(this.programPhases);
    const lastPhase = phases[phases.length - 1];
    return this.thisPhaseName !== lastPhase;
  }

  private fillBtnText() {
    return this.programPhaseService.getPhaseByName(this.thisPhaseName).btnText;
  }

  public async advancePhase() {
    this.isInProgress = true;
    this.programPhaseService.advancePhase().finally(() => {
      this.isInProgress = false;
    });
  }
}
