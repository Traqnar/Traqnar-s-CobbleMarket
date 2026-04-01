# CobblemonMarketFront

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Sync Bridge A/B (local)

The Electron main process now exposes an internal endpoint:

- `POST http://127.0.0.1:5151/api/mc/sync-transfer-and-tpaccept`

Expected request body:

```json
{
  "partySlotId": 0,
  "leadDelayMs": 1200,
  "requestId": "optional-string"
}
```

What it does:

- Builds one shared payload (`action`, `requestId`, `executeAtEpochMs`, `partySlotId`).
- Sends in parallel to:
  - `http://127.0.0.1:5149/api/bridge/sync-party-pc-and-tpaccept`
  - `http://127.0.0.1:5150/api/bridge/sync-party-pc-and-tpaccept`
- Uses strict timeout (~3.5s) and max 1 retry.

The Pokémon page includes a panel to trigger this action and inspect A/B response details.

Minimal unit test for payload builder:

```bash
npm run test:mc-sync
```
