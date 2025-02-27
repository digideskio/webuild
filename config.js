var city = 'Singapore';
var country = 'Singapore';
var locationSymbol = 'SG';
var db = require('./lib/database')
var logger = require('./lib/logger')

module.exports = function(callback) {
  db.once('value', function(snapshotAll) {
    var snapshot = snapshotAll.val()

    return callback({
      location: city,
      city: city,
      country: country,
      symbol: locationSymbol,

      api_version: 'v1',
      apiUrl: 'https://webuild.sg/api/v1/',

      displayTimeformat: 'DD MMM YYYY, ddd, h:mm a',
      dateFormat: 'YYYY-MM-DD HH:mm Z',
      timezone: '+0800',
      timezoneInfo: 'Asia/Singapore',

      debug: process.env.NODE_ENV === 'development',

      calendarTitle: 'We Build SG Events',
      podcastApiUrl: 'http://webuildsg.github.io/live/api/v1/podcasts.json',
      domain: 'webuild.sg',

      facebookGroups : snapshot.facebookGroups,
      blacklistEvents: snapshot.blacklistEvents,
      whitelistEvents: snapshot.whitelistEvents,
      icsGroups: snapshot.icsGroups,
      whitelistGroups: snapshot.whitelistGroups,

      archives: {
        githubRepoFolder: 'webuildsg/data/',
        committer: {
          name: 'We Build SG Bot',
          email: 'webuildsg@gmail.com'
        }
      },

      ignoreWordsInDuplicateEvents: [
        "meetup", "group", "event",

        "centre", "center", "tower", "road", "boulevard", "ayer",
        "avenue", "ave",
        "building", "city",
        "jalan", "jln",
        "lane", "ln",
        "street", "st",
        "plaza", "town", "new",
        "level", "floor",

        "first",
        "second",
        "third",

        "jan", "january",
        "feb", "february",
        "mar", "march",
        "apr", "april",
        "may",
        "jun", "june",
        "jul", "july",
        "aug", "august",
        "sep", "sept", "september",
        "oct", "october",
        "nov", "november",
        "dec", "december",
        "-",

        "mon", "monday",
        "tue", "tues", "tuesday",
        "wed", "wednesday",
        "thu", "thurs", "thursday",
        "fri", "friday",
        "sat", "saturday",
        "sun", "sunday",

        "topic", "create", "talk", "session", "workshop", "tell", "share", "coding", "venue", "about",

        "speaker", "member",

        "a", "i", "will", "be", "who", "want", "or", "have", "if", "go", "of", "with", "from", "for",

        "the", "others", "another", "all",

        "your", "you", "our", "you\"re", "we\"re"
      ],

      auth0: {
        domain: 'webuildsg.auth0.com',
        clientId: process.env.WEBUILD_AUTH0_CLIENT_ID,
        clientSecret: process.env.WEBUILD_AUTH0_CLIENT_SECRET
      },

      githubParams: {
        version: '3.0.0',
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        location: process.env.LOCATION || city,
        maxUsers: process.env.MAX_USERS || 1000,
        maxRepos: process.env.MAX_REPOS || 100,
        starLimit: process.env.STAR_LIMIT || 50,
        outfile: __dirname + '/cache.json'
      },

      meetupParams: {
        key: process.env.MEETUP_API_KEY,
        country: locationSymbol,
        state: locationSymbol,
        city: city,
        category_id: 34, // Tech category
        page: 500,
        fields: 'next_event',
        offset: 0,

        blacklistGroups: snapshot.meetupBlacklistGroups
      },

      eventbriteParams: {
        token: process.env.EVENTBRITE_TOKEN,
        url: 'https://www.eventbriteapi.com/v3/events/search',
        venueUrl: 'https://www.eventbriteapi.com/v3/venues/',
        organizerUrl: 'https://www.eventbriteapi.com/v3/organizers/',
        categories: [
          '102',
          '119'
        ],
        blacklistOrganiserId: snapshot.eventbriteBlacklistOrganiserIds
      }
    })
  })
}
