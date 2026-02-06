Feature: Booking.com search with currency, flexible dates, guests and pets

  Scenario: Search hotels in London with TRY currency, flexible month dates, 8 adults and pets enabled
    Given I open the Booking homepage
    And if an advertisement popup is visible I close it

    When I open the currency selector
    And I select currency "TRY"
    And if an advertisement popup is visible I close it

    When I focus destination input
    And I type destination "London"
    And I select the first destination suggestion
    And if an advertisement popup is visible I close it

    When I open the date picker
    And I choose flexible dates
    And I select length of stay "A month"
    And I select month "2026Jun"
    And I confirm dates
    And if an advertisement popup is visible I close it

    When I open guests and rooms selector
    And I set Adults to 8
    And I set Children to 0
    And I set Rooms to 1
    And I enable travelling with pets
    And I confirm guests selection
    And if an advertisement popup is visible I close it

    When I click Search
    Then I should see hotel results

    When I open availability for hotel #3
    Then the availability page should be displayed
