the featuers that we have so far achieved:

1. the landing page
2. AI integration even though it was way later in our plans, as requested by our lab instructors we have implemented them first. but now since none of our featues have been implemented yet, they are claminig that we have just made an AI wrapper. 
3. Google maps integration


thing i believe that we have still left to implement in slightly or fully:

1. search page. the current search page is still dummy and doesn't do anything. we need to make it live with every element of it working including the recommended searches. as you can see in this 
dashboard
 folder which is a folder that i have extacted from another unmerged teammate's branch, we intend to move some options to when you hover above the profile icon they appear below it. and those options include "my trips, saved places, etc" and in their plane i with to put "destinations" just like on the landing page of the loggedout user. both these destinations page with serve the same search page currently 
page.tsx
 

for a non logged in user or unregiesterd user, we will still allow them to search for places, research their travel and make an itinerary but AI useage will be limited to say like 5-7 prompts. and they will not be able to save their generated content without logging in. we are allowing people to use the featues bare  minimum is to address the "million dollar button" problem. 

2. Proper itinerary planner. the itinerary planner is stil broken. while it has successfully implemented the AI features it needs to be more like 
itinerary_example.tsx
  functionally while maintaining the visual look of the current one. 

3. users need to be able to look into places like they are searching for places to visit on our platform just as they search on websites like agoda or booking.com when they are looking for hotels. when they search for a country name, of course there will be auto completion suggestions and even if they hit enter, the country will appear down below as a search result. when they will click on the country, they will be shown brief desciption of that country, lots of photos and "prominent cities".

here honestly "district" will be a better term as it's not always a city like island or valleys or similar places

when they click on any of the cities or if they searched for a city and then clicked on it they will again be given a brief on that place and will be presented with a list of "things to do" they will be able to add these to their "collection" on our itinerary page. then there they can make thier own final itinerary or have the AI do it for them

4. they will be able to share trip progress. like a special card like when delivery companies give you a public link to track delivery progress "your product is packed" "your product is at the warehouse" "your product has been shipped" and so on, similarly there will be function to share their trip progress

5. auto completion of trip progress based on geolocation as outlined by my teammate in 
LOCATION_TRACKING_IMPLEMENTATION_PLAN.md
 

6. people will be able to arrange group tours with fellow travellers on the platform. specially for activites that require a minimum group size and solo travellers lookiing for such a group

7. they will be able to submit "inclusion" requests for places they feel like should be included on the platform but is missing

8. they will be able to share photos, like comment share like social media in the "co-travellers" tab 

9. using the platform, reviewing places, sharing their photos etc this way they will build thier timeline which they can visit any time by going on their profile and then share them on this platform in "co-travellers" or any other social media. this is like the "memories" feature on Facebook. 

10. the current user profile is still static, we need to make it dynamic. on the profile there is a "places i have been" we can use this to gamify travelling by showing a fun graph or stats like on gihub contributions plane. and give funny achievements "you have travered the earth in 60 days" etc etc. we can assign levels or levelling  to profiles to make the experience of using the platform more fun by gamifying things. 


11. when making itinerary one has to first select the date range and then the number of person or solo travelling then select a starting city. when adding their places to a collection they must do so in the collections of an itinerary, that is without having an itinerary in development they cannot add places to any collection. that is also why loggedout or unregistered users will have only one itinerary for them, when they click on destinations they will be asked to fill in the date range at least (they will be allowd to skip but they will not be able to "collect" places" 

12. we also need a mobile app because no one wil be touring around with their laptop in hand.


ok i think that's about it. it's a lot and we would like to implement all these by next monday. or achieve most of these by next monday