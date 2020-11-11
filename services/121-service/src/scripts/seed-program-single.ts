import { Injectable } from '@nestjs/common';
import { InterfaceScript } from './scripts.module';
import { Connection } from 'typeorm';

import { SeedHelper } from './seed-helper';
import { SeedPublish } from './seed-publish';
import { SeedInit } from './seed-init';

import fspBank from '../../seed-data/fsp/fsp-bank.json';
import fspMobileMoney from '../../seed-data/fsp/fsp-mobile-money.json';
import fspMixedAttributes from '../../seed-data/fsp/fsp-mixed-attributes.json';
import fspNoAttributes from '../../seed-data/fsp/fsp-no-attributes.json';
import fspIntersolve from '../../seed-data/fsp/fsp-intersolve.json';
import fspAfricasTalking from '../../seed-data/fsp/fsp-africas-talking.json';

import { ProtectionServiceProviderEntity } from '../programs/program/protection-service-provider.entity';

import programAnonymousExample1 from '../../seed-data/program/program-anonymous1.json';
import instanceAnonymous from '../../seed-data/instance/instance-anonymous.json';
import { UserRole } from '../user-role.enum';

@Injectable()
export class SeedSingleProgram implements InterfaceScript {
  public constructor(private connection: Connection) {}

  private readonly seedHelper = new SeedHelper(this.connection);
  private readonly seedPublish = new SeedPublish();

  public async run(): Promise<void> {
    const seedInit = await new SeedInit(this.connection);
    await seedInit.run();

    // ***** CREATE USERS *****
    await this.seedHelper.addUser({
      role: UserRole.Aidworker,
      email: process.env.USERCONFIG_121_SERVICE_EMAIL_AID_WORKER,
      password: process.env.USERCONFIG_121_SERVICE_PASSWORD_AID_WORKER,
    });

    await this.seedHelper.addUser({
      role: UserRole.ProjectOfficer,
      email: process.env.USERCONFIG_121_SERVICE_EMAIL_PROJECT_OFFICER,
      password: process.env.USERCONFIG_121_SERVICE_PASSWORD_PROJECT_OFFICER,
    });

    await this.seedHelper.addUser({
      role: UserRole.ProgramManager,
      email: process.env.USERCONFIG_121_SERVICE_EMAIL_PROGRAM_MANAGER,
      password: process.env.USERCONFIG_121_SERVICE_PASSWORD_PROGRAM_MANAGER,
    });

    // ***** CREATE FINANCIAL SERVICE PROVIDERS *****
    await this.seedHelper.addFsp(fspIntersolve);
    await this.seedHelper.addFsp(fspAfricasTalking);
    await this.seedHelper.addFsp(fspBank);
    await this.seedHelper.addFsp(fspMobileMoney);
    await this.seedHelper.addFsp(fspMixedAttributes);
    await this.seedHelper.addFsp(fspNoAttributes);

    // ***** CREATE PROTECTION SERVICE PROVIDERS *****
    const protectionServiceProviderRepository = this.connection.getRepository(
      ProtectionServiceProviderEntity,
    );
    await protectionServiceProviderRepository.save([
      { psp: 'Protection Service Provider A' },
    ]);
    await protectionServiceProviderRepository.save([
      { psp: 'Protection Service Provider B' },
    ]);

    // ***** CREATE PROGRAM *****
    const examplePrograms = [programAnonymousExample1];
    await this.seedHelper.addPrograms(examplePrograms, 1);

    // ***** ASSIGN AIDWORKER TO PROGRAM *****
    await this.seedHelper.assignAidworker(2, 1);

    // ***** CREATE INSTANCE *****
    await this.seedHelper.addInstance(instanceAnonymous);
  }
}

export default SeedSingleProgram;
