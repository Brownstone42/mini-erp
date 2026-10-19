# Multi-company database isolation

## Decision

The web application will support a company mode switcher. Ideal Globe remains the default company.

Goodbooch data will not share business tables with Ideal Globe. It will use:

- the existing Firebase project and Firebase Authentication;
- the existing Cloud SQL PostgreSQL instance in `asia-southeast1` initially;
- a separate PostgreSQL database named `goodboocherp` (without `_`, matching the Firebase setup naming constraint);
- a separate Firebase SQL Connect service and connectors.

## Reason

A separate PostgreSQL database provides a hard data boundary and prevents imports, reports, running numbers, and settings from mixing between companies. Reusing the Cloud SQL instance avoids the fixed cost and maintenance of a second instance. A second instance remains possible later if workload, billing, backup, or legal isolation requires it.

## Application rule

Until the Goodbooch service is connected, Goodbooch mode must not call Ideal Globe data services. Its navigation is limited to a safe workspace page.

## Goodbooch starting point

Goodbooch starts fresh. Do not copy the Ideal Globe schema, modules, menus, import rules, reports, running numbers, settings, or master data into Goodbooch. Add each Goodbooch capability only after its own requirement has been discussed and accepted.
