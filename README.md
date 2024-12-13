# MMM-EnphaseBattery

Yep, it's a connector for your enphase battery! well, it's a connector for _my_ enphase batteries, that i'm putting here in case other people need it.

### How It Works, Allegedly

#### Book 1: Getting Keys
You need to set up a developer account here: https://developer-v4.enphase.com

Put in whatever, you *do not* need to pay for anything. the Watt plan is fine.

Create a new application, call it whatever, again, doesn't matter.

What you want is to get an *API Key* as well as a *Client ID* and *Client Secret*. **All of that comes from the Application you just created.**

You also need your *Site ID* and *User ID* from Enphase. **This is from *your* system, https://enlighten.enphaseenergy.com/web/[Site ID]/.**

The Site ID is probably right at the bottom.

The User ID is Hamburger menu -> Account -> Access Control.

#### Book 2: I Cheat For You
OKAY COOL you got all that, congrats, that took me like six hours and you maybe ten minutes. you're welcome.

Now, you take all that and ram it into enphase-auth.sh. This takes your client ID, Client Secret, and API key, then throws a web page to log in. **Log in with your Enphase Credentials** to generate an authorized key that provides access to *your* system through *that* key to *your* application. Not mine, not anyone else's. Maybe don't share that. I dunno, i ain't your boss.

You log in, and then you'll see an error page, because it loops back to Localhost. That's the point - the URL includes the auth code. It will look like: http://localhost/?code=SOMETHING. Take SOMETHING and put that in the script, and it will generate a LONGER SOMETHING, which is a base64 encoded accessToken.

And then it'll give you the stanza you put in to config.js. 

That _should_ be it, but please see the FAQ if something breaks.

#### Configuration Flags
Also, you can pass some flags to it to do some stuff:

These are required:

        apiKey: "$API_KEY",
        accessToken: "$access_token",
        systemId: "$system_id"

These are options, and what their defaults are:
        
        updateInterval: 5 * 60 * 1000, (sets the update interval. I'd just leave that as it is unless you really want to pay $249 a month to show your house's battery status on a mirror. i dunno, you do you.)
        animationSpeed: 1000, (if this is too slow for you i think your battery is draining too fast my dude)
        showLastUpdate: false, (i turned this off because it just makes it messier. if you're having timeout issues, maybe you want it on.)
        showBatteryIcon: true, (icons are cool man)
        showCapacity: false, (i know how big my battery is, i don't need to see it on the mirror. maybe you do.)
        showDevicesReporting: false, (this shows each individual battery, plus the gateway, plus... anyway, again, maybe useful for troubleshooting, but i would leave this as is.)
        debug: false (again, useful for troubleshooting. everything should output to mm-out and mm-error.)


## FAQ

### Will it work with my setup?
I dunno! try it.
### I got a weird response from the script!
Yeah, it gets goofy if you've exhausted your API attempts. if magic mirror is running it might have blown through the free tier. 
### I think there's a better way to do this!
cool, go write it. 
### I have a suggestion about how to improve it
neat, this is github, go make a pull request and, you know, [gesticulates]
