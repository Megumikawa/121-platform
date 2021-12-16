import { Component, Input, ViewEncapsulation } from '@angular/core';
import { PersonalDirective } from 'src/app/personal-components/personal-component.class';
import { ConversationService } from 'src/app/services/conversation.service';

@Component({
  selector: 'app-contact-details',
  templateUrl: './contact-details.component.html',
  styleUrls: ['./contact-details.component.scss'],
  encapsulation: ViewEncapsulation.None, // Disabled because we need to style inserted HTML from the database
})
export class ContactDetailsComponent extends PersonalDirective {
  @Input()
  public data: any;

  public contactDetails: string;

  public show = false;

  public isCanceled = false;

  constructor(
    public conversationService: ConversationService,
  ) {
    super();
  }
  complete(): void {
      
  }
  getNextSection(): string {
      return
  }
  
  async ngOnInit() {
  }

  
}
