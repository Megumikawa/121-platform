@ho-portal
Feature: Edit information on Person Affected

  Background:
    Given the "selected phase" is one of the phases with the "People Affected table"

  Scenario: View icon to view information
    Given a logged-in user with "personal data" role
    When the user views the "People Affected Table"
    Then the user sees an "information icon" in each row at the beginning of the "Person Affected" column
    When the user hovers over it
    Then it is highlighted

  Scenario: No permission to edit information
    Given the user does not have the "personal data" role
    When the user views the "People Affected Table"
    Then the user does not see the information-icon, but only the 'PA#X' text

  Scenario: Open the popup to view and edit information
    Given a logged-in user with "personal data" role
    When the user click the "information icon"
    Then a popup opens
    And in the title the ID-number of the Person Affected is mentioned
    And an input-field for the "paymentAmountMultiplier", "partnerOrganization" and "phoneNumber" is shown
    And an input-field for each FSP-attribute (such as "whatsappPhoneNumber") is shown
    And all input-fields have an accompanying "update" button which is enabled
    And the pop-up shows a dropdown-list for the current FSP is shown
    And it has an accompanying "update" button which is disabled
    And the popup has a "Notes" section
    And an input-field for the "paymentAmountMultiplier" is shown
    And the popup has a "Notes" section and a "Message History" section
    And there is an explanation, including PII-warning
    And there is a free text "note" field
    And it shows the current version of the note if available
    And it shows a placeholder if no note currently saved
    And there is a "save" button
    And there is a 'Last updated on' mention if there is a current version of the note available

  Scenario: Successfully update note
    Given a logged-in user with "personal data" role
    Given the user has opened the popup to edit information
    And whether the user has changed something or not in the "note" field
    When the user presses the "save" button
    Then the content of the "note" field is written to the database
    And the date+time of this action is written to the database
    And a feedback message is shown that the save was successful
    When the user closes this feedback message
    When the user opens the popup for the same PA again
    Then the user sees the updated note
    And the user sees a new "last updated" time

  Scenario: Unsuccessfully update note
    Given a logged-in user with "personal data" role
    Given something goes wrong for some reason (which cannot be simulated by the tester)
    When the user presses the "save" button
    Then a feedback message that something went wrong is given
    And it gives the basic error type if possible, e.g. "Bad Request"

  Scenario: Update paymentAmountMultiplier successfully
    Given a logged-in user with "personal data" role
    Given the user has opened the popup to edit information
    Given an input-field for the "paymentAmountMultiplier" is shown
    When the user changes the value and presses the  update-button
    Then the update-button changes into a progress indicator
    And the value of the input-field is written to the database
    And the progress indicator changes into the update-button again
    And the page refreshes

  Scenario: Update paymentAmountMultiplier with invalid value
    Given a logged-in user with "personal data" role
    Given the user has opened the popup to edit information
    Given an input-field for the "paymentAmountMultiplier" is shown
    When the user changes the value to "" or a negative number and presses the  update-button
    Then the update-button changes into a progress indicator
    And a feedback message with the specific requirements of the value is shown
    And the progress indicator changes into the update-button again

  Scenario: Update other attributes
  Similar to updating 'paymentAmountMultiplier', possibly with other specific validation rules. TBC.

  Scenario: Update chosen FSP
    Given a logged-in user with "personal data" role
    Given the user has opened the popup to edit information
    Given an input-field for the current "FSP" is shown
    When the user changes the chosen FSP
    Then a message appears that attributes relating to the current FSP will be deleted and it lists these attributes
    And for each attribute of the new FSP a new input field appears

    When the user has filled in values for each new input field
    Then the 'update' button of the chosen 'FSP' gets enabled

    When the user clicks the 'update' button
    Then the request is made
    And response is given whether it was successfull or not (if not, likely due to validation errors on the input-fields)

    When the user closes and re-opens the pop-update
    Then the input-fields for attributes of the old FSP are gone
    And input-fields for attributes of the new FSP are shown
    And the new FSP shows as the current selected value of the dropdown

  Scenario: Message History
    Given a logged-in user with "personal data" role
    Given the user has opened the popup to view and edit information
    Then after the Notes section if any messages are sent to PA then "Message History" section will be available
    And under this section initially 5 messages will be visible with "Show More" button
    When the user click the "Show More " button complete message list will be displayed
    And the "Show More" button will no longer be visible
