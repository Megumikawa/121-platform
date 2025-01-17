import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { UserRole } from 'src/app/auth/user-role.enum';
import { Program } from 'src/app/models/program.model';
import { ProgramsServiceApiService } from 'src/app/services/programs-service-api.service';
import { TranslatableStringService } from 'src/app/services/translatable-string.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  @Input()
  public title: string;

  public programId: number;
  private program: Program;
  public programTitlePortal: string;

  public showManageAidworkers: boolean;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private programsService: ProgramsServiceApiService,
    private translatableString: TranslatableStringService,
  ) {
    this.programId = this.route.snapshot.params.id;
  }

  public async ngOnInit() {
    await this.loadProgramDetails();
    this.showManageAidworkers = !!this.program.validation;
  }

  private async loadProgramDetails() {
    this.program = await this.programsService.getProgramById(this.programId);
    this.programTitlePortal = this.translatableString.get(
      this.program?.titlePortal,
    );
  }

  public canManageAidWorkers(): boolean {
    return this.authService.hasUserRole([UserRole.RunProgram]);
  }
}
