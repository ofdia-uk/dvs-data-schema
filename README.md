<!-- caution-banner:start (wording is kept in tools/caution-banner.md; edit it there) -->
> [!CAUTION]
> This is a working draft of the UK digital verification services trust framework data schema, maintained for collaboration and review. It is not the formally published version and may differ from it. For the published data schema, see [GOV.UK](https://www.gov.uk/government/publications/uk-digital-verification-services-trust-framework-data-schema-1-0).
<!-- caution-banner:end -->

![Office for Digital Identities and Attributes](media/ofdia-banner.jpg)

# UK digital verification services trust framework data schema

This is the working draft of the UK digital verification services (DVS) trust framework data schema, maintained by the [Office for Digital Identities and Attributes (OfDIA)](https://www.gov.uk/government/organisations/office-for-digital-identities-and-attributes).

The data schema helps DVS providers and relying parties organise and exchange information in a consistent way. Using it is optional for certified services.

We use this repository to share the data schema as it develops, gather feedback on it, and keep a public record of every change and the reasons for it.

## Status

- **Published version:** [UK digital verification services trust framework data schema 1.0](https://www.gov.uk/government/publications/uk-digital-verification-services-trust-framework-data-schema-1-0) on GOV.UK. This is the authoritative version.
- **This repository:** the working draft. It starts from the published 1.0 text and may include accepted changes that have not been published yet.
- **Changes since publication:** [compare the working draft with published 1.0](https://github.com/ofdia-uk/dvs-data-schema/compare/published-1.0...main).

A change accepted here does not change the published data schema. Changes take effect only when OfDIA publishes a new version on GOV.UK. [How versions work](VERSIONS.md).

## Read the data schema

The data schema has 2 guides. Each guide has the same 6 sections. Start from the [contents page](schema-1.0/README.md), or go straight to a section. You can also [read it on the website](https://ofdia-uk.github.io/dvs-data-schema/), which is easier to read if you do not use GitHub.

The data model shows how the data is structured. The data dictionary, predefined values and predefined lists give the formats and the values each element can have.

**[GPG 45: identity checking](schema-1.0/gpg-45/README.md)**

- [1. Introduction](schema-1.0/gpg-45/01-introduction.md)
- [2. Data taxonomy](schema-1.0/gpg-45/02-data-taxonomy.md)
- [3. Data model](schema-1.0/gpg-45/03-data-model.md)
- [4. Data dictionary](schema-1.0/gpg-45/04-data-dictionary.md)
- [5. Predefined values](schema-1.0/gpg-45/05-predefined-values.md)
- [6. Predefined lists](schema-1.0/gpg-45/06-predefined-lists.md)

**[GPG 44: authentication](schema-1.0/gpg-44/README.md)**

- [1. Introduction](schema-1.0/gpg-44/01-introduction.md)
- [2. Data taxonomy](schema-1.0/gpg-44/02-data-taxonomy.md)
- [3. Data model](schema-1.0/gpg-44/03-data-model.md)
- [4. Data dictionary](schema-1.0/gpg-44/04-data-dictionary.md)
- [5. Predefined values](schema-1.0/gpg-44/05-predefined-values.md)
- [6. Predefined lists](schema-1.0/gpg-44/06-predefined-lists.md)

## Give feedback

Anyone with a GitHub account can give feedback. You do not need to suggest new wording, and you do not need to know the technical name of a field.

1. Find the guide and section your feedback is about.
2. [Open a new issue](https://github.com/ofdia-uk/dvs-data-schema/issues/new/choose) and choose the kind of feedback you want to give.
3. Fill in the form and submit it.

[How to give feedback](CONTRIBUTING.md) explains each kind of feedback and what happens after you submit it.

## See how the data schema changes

Changes are proposed and reviewed in pull requests before OfDIA accepts them. Each pull request shows exactly what changed, the discussion about the change, and the feedback that led to it.

- [Pull requests](https://github.com/ofdia-uk/dvs-data-schema/pulls): proposed changes and their review
- [History](https://github.com/ofdia-uk/dvs-data-schema/commits/main): every accepted change, newest first
- [Changes since publication](https://github.com/ofdia-uk/dvs-data-schema/compare/published-1.0...main): the working draft compared with published 1.0

## Supporting material

[Supporting material](supporting-material/README.md) holds diagrams, spreadsheet and data files, and notes on other standards. It is there to help people use the data schema. It is not part of the published data schema.

## About this repository

- [Versions and published baselines](VERSIONS.md)
- [How this repository works](ARCHITECTURE.md), for maintainers
- [Security](SECURITY.md)
- [Licence](LICENCE.md): content is available under the Open Government Licence v3.0
