# the [io](https://io.klarstrup.dk/) app


<table><tbody><tr><td>
<img width="1709" height="988" alt="Screenshot 2025-08-31 at 13 20 57" src="https://github.com/user-attachments/assets/8483b3ef-d768-4def-afb5-6ea39589e5d4" />
</td><td>
<img width="550" height="927" alt="Screenshot 2025-08-31 at 13 21 07" src="https://github.com/user-attachments/assets/8e0b9e9c-0ee1-4bfc-9080-84761a0202ea" />
</td><td>
<img width="702" height="918" alt="Screenshot 2025-08-31 at 13 23 27" src="https://github.com/user-attachments/assets/b9c5cc09-8c02-4cb4-8154-62992f9cec46" />
</td><td>
<img width="710" height="924" alt="Screenshot 2025-08-31 at 13 24 45" src="https://github.com/user-attachments/assets/d774c706-7711-47e2-a5b5-3938f77ba3a4" />
</td></tr></tbody></table>

hi im io and [io.klarstrup.dk](https://io.klarstrup.dk/) is my attempt to make a personal system for consolidating my life/fitness data from a ton of different apps and planning & for journaling and planning my life and fitness goals  

this system and app is developed principally to suit my needs, but anyone with a GitHub account can sign in and start using it

## first party features

- **workout tracking**, from basic sets of exercises of various weights and reps to more climbing-specific augmentations such as the ability to associate "circuits" of predefined colors/grades with the climbing gym "locations" of workouts
- **exercise development programming**, enabling linear progressive overload style strength and skill development
- **calendar agenda aggregation** with any provided **iCal/`.ical`/`.ics` source**

## third party features

- **workout tracking** via ~~[Fitocracy](https://www.fitocracy.com/)~~, [TopLogger](https://toplogger.nu/en), [RunDouble](https://www.rundouble.com/home), [Kilter Board](https://play.google.com/store/apps/details?id=com.auroraclimbing.kilterboard), [MoonBoard](https://moonclimbing.com/moonboard), [Grippy](https://griptonite.io/grippy/), [Crimpd](https://www.crimpd.com/)
- **competition journaling** via [Sportstiming](https://www.sportstiming.dk/), [TopLogger](https://toplogger.nu/en), [Onsight](https://onsight.one/), [ClimbAlong](https://climbalong.com/)
- **weather forecast** via [tomorrow.io](https://www.tomorrow.io/)

| <h1>**API<br/>404**</h1> | <img width="201" height="169" alt="image" src="https://github.com/user-attachments/assets/0068e0f7-fdce-424e-9685-76906a0c5fcd" /> | <img width="358" height="331" alt="image" src="https://github.com/user-attachments/assets/34f814cc-4f03-47f3-bd12-2d93134f60a3" /> |
| :----: | :----: | :----: |
| <i>most of these data sources currently don't use official 3rd party APIs, as most of these service providers do not have one.</i> | <i>generally they require the user to manually extract authentication/session data from an existing sign-on, and inputting them in the settings for the given data source</i> | <i>weather forecasts are fetched based on a simple geohash input</i> |

# development


## Getting Started

0. have bun installed and a mongodb instance running

1. populate .env.local

<!-- TODO: write how to do this

3. install dependencies and run the development server:

```bash
bun install
bun run dev
```

3. open the local URL provided in the Next.js console output

4.  ❓❔❓❔

5.  profit!
