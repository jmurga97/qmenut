# Graph Report - /Users/murgapja/dev/qmenut  (2026-07-18)

## Corpus Check
- 67 files · ~96,973 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3084 nodes · 5592 edges · 278 communities (232 shown, 46 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.6)
- Token cost: 28,000 input · 4,184 output

## Community Hubs (Navigation)
- Price Web Component
- Admin Route Tree
- Admin Data Repositories
- Contact & Legal UI
- Admin Menu/Promotion Forms
- Admin Promotions API
- Divider Web Component
- Loyalty Card Operations
- Chip Web Component
- Admin Menu Router
- Auth Shell & Branch Store
- Admin Languages
- Promotion Schemas & Router
- Public Route Tree
- Reward Row Web Component
- Public Branch Mapping
- Public Menu Mapping
- Project Docs & Concepts
- Field Web Component
- Auth & Entitlements
- Public Locale Pages
- Billing & Stripe
- Package Dependencies
- Admin Branch Settings UI
- Content Versioning & Translations
- Branch Settings Service
- TypeScript Config
- Loyalty Ledger
- Admin Pages & Forms
- Image Web Component
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Community 231
- Community 232
- Community 233
- Community 234
- Community 235
- Community 236
- Community 237
- Community 240
- Community 241
- Community 242
- Community 243
- Community 244
- Community 245
- Community 246
- Community 247
- Community 248
- Community 249
- Community 250
- Community 251
- Community 252
- Community 253
- Community 254
- Community 255
- Community 256
- Community 257
- Community 258
- Community 259
- Community 260
- Community 261
- Community 262
- Community 263
- Community 264
- Community 265
- Community 266
- Community 267
- Community 268
- Community 269
- Community 270
- Community 271
- Community 272
- Community 273
- Community 275

## God Nodes (most connected - your core abstractions)
1. `DrizzleDb` - 167 edges
2. `IntrinsicElements` - 73 edges
3. `exports` - 57 edges
4. `exports` - 40 edges
5. `qmHostResetStyles` - 37 edges
6. `createComponentStyles()` - 37 edges
7. `assertBranchAccess()` - 27 edges
8. `FileRoutesByPath` - 26 edges
9. `QmElement` - 23 edges
10. `useSelectedBranch()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `CreateAuthInput` --references--> `DrizzleDb`  [EXTRACTED]
  apps/api/src/auth/create-auth.ts → packages/db/src/client.ts
- `GetBranchEntitlementInput` --references--> `DrizzleDb`  [EXTRACTED]
  apps/api/src/lib/billing/entitlement.ts → packages/db/src/client.ts
- `BumpPublicContentVersionForBranchInput` --references--> `DrizzleDb`  [EXTRACTED]
  apps/api/src/lib/public-content-version.ts → packages/db/src/client.ts
- `BumpPublicContentVersionForRestaurantInput` --references--> `DrizzleDb`  [EXTRACTED]
  apps/api/src/lib/public-content-version.ts → packages/db/src/client.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Admin App Bootstrap Flow** — apps_admin_index_theme_bootstrap, apps_admin_index_root_mount, apps_admin_index_main_entry [INFERRED 0.75]
- **Three-Worker Cloudflare Topology** — docs_architecture_api_worker, docs_architecture_web_worker, docs_architecture_tenant_config_worker, docs_architecture_tenant_theme_kv [EXTRACTED 1.00]
- **Two-Path Tenant Isolation** — docs_domains_multi_tenancy_public_path, docs_domains_multi_tenancy_admin_path, docs_domains_custom_domains_tenant_resolution, docs_architecture_tenant_procedure [EXTRACTED 1.00]
- **Venue-Code Stamp-Earning Flow** — docs_domains_loyalty_venue_code, docs_domains_loyalty_card_token, docs_domains_loyalty_ledger, docs_design_loyalty_ux_presence_over_approval [EXTRACTED 1.00]
- **Tenant theme SSR flow (KV to pixels)** — docs_domains_theming_tenant_theme_kv, docs_domains_theming_get_tenant_context, docs_domains_theming_build_qm_theme_vars, docs_domains_theming_color_engine [EXTRACTED 1.00]
- **Tenant onboarding to legal pages** — docs_operations_onboarding_intake_restaurant_intake, docs_operations_onboarding_intake_tenant_json, docs_operations_onboarding_intake_legal_placeholders, apps_web_src_features_legal_content_legal_notice_en_legal_notice [EXTRACTED 0.85]
- **UI component accessibility primitives** — packages_ui_contributing_qm_element, packages_ui_contributing_focusable_mixin, packages_ui_contributing_focus_trap [EXTRACTED 0.90]

## Communities (278 total, 46 thin omitted)

### Community 0 - "Price Web Component"
Cohesion: 0.06
Nodes (44): state, QmBadgeArgs, componentStyles, defineQmPrice(), HTMLElementTagNameMap, QmPrice, QmPriceArgs, property (+36 more)

### Community 1 - "Admin Route Tree"
Cohesion: 0.04
Nodes (56): AuthBillingRoute, AuthBranchRoute, AuthIndexRoute, AuthLanguagesIndexRoute, AuthLanguagesLanguageCodeRoute, AuthLanguagesRoute, AuthLanguagesRouteChildren, AuthLanguagesRouteWithChildren (+48 more)

### Community 2 - "Admin Data Repositories"
Cohesion: 0.05
Nodes (37): rejectRedemption(), RejectRedemptionInput, saveReward(), SaveRewardInput, DrizzleDb, AdminCategory, CategoryTranslatableFields, CategoryWriteData (+29 more)

### Community 3 - "Contact & Legal UI"
Cohesion: 0.09
Nodes (36): ContactPanel(), ContactPanelProps, ContactFieldEventDetail, useContactForm(), UseContactFormInput, ContactPage(), LegalLinksNav(), LegalPageLayout() (+28 more)

### Community 4 - "Admin Menu/Promotion Forms"
Cohesion: 0.10
Nodes (39): BranchForm(), TranslationsContent(), toLoyaltyProgramFormValues(), toLoyaltyProgramInput(), toRewardFormValues(), toRewardInput(), BranchQueryInput, getCategoryMutationOptions() (+31 more)

### Community 5 - "Admin Promotions API"
Cohesion: 0.07
Nodes (41): ApiContext, DetailQueryInput, BranchInput, getPromotionMutationOptions(), getPromotionQueryOptions(), getPromotionsQueryOptions(), invalidatePromotions(), MutationInput (+33 more)

### Community 6 - "Divider Web Component"
Cohesion: 0.06
Nodes (35): componentStyles, defineQmDivider(), HTMLElementTagNameMap, QmDivider, QmDividerArgs, QmDividerVariant, property, componentStyles (+27 more)

### Community 7 - "Loyalty Card Operations"
Cohesion: 0.07
Nodes (37): cancelRedemption(), CancelRedemptionInput, createCard(), CreateCardInput, CreateCardResult, earnStamp(), EarnStampInput, CardRewardView (+29 more)

### Community 8 - "Chip Web Component"
Cohesion: 0.06
Nodes (32): componentStyles, defineQmChip(), HTMLElementTagNameMap, QmChip, QmChipArgs, QmChipVariant, property, componentStyles (+24 more)

### Community 9 - "Admin Menu Router"
Cohesion: 0.06
Nodes (40): categoriesRouter, categoryIdInputSchema, dishDetailInputSchema, dishesRouter, dishIdInputSchema, setDishAvailabilityInputSchema, taxonomyRouter, getDishDetail() (+32 more)

### Community 10 - "Auth Shell & Branch Store"
Cohesion: 0.11
Nodes (27): Route, BranchLike, BranchStore, resolveSelectedBranch(), useBranchStore, ShellStore, useShellActions(), useShellMobile() (+19 more)

### Community 11 - "Admin Languages"
Cohesion: 0.12
Nodes (31): getLanguageCatalogQueryOptions(), getLanguageMutationOptions(), getLanguagesQueryOptions(), getTranslationsQueryOptions(), getUpdateTranslationMutationOptions(), invalidateLanguages(), useLanguagesController(), useTranslationsController() (+23 more)

### Community 12 - "Promotion Schemas & Router"
Cohesion: 0.07
Nodes (34): branchIdSchema, promotionIdSchema, createPromotionSchema, nullableText, promotionTargetSchema, promotionWriteSchema, updatePromotionSchema, createBranchPromotion() (+26 more)

### Community 13 - "Public Route Tree"
Cohesion: 0.07
Nodes (31): Char123LocaleChar125AvisoLegalRoute, Char123LocaleChar125ContactoRoute, Char123LocaleChar125IndexRoute, Char123LocaleChar125PrivacidadRoute, Char123LocaleChar125PromosRoute, Char123LocaleChar125PuntosRoute, Char123LocaleChar125Route, Char123LocaleChar125RouteChildren (+23 more)

### Community 14 - "Reward Row Web Component"
Cohesion: 0.08
Nodes (23): componentStyles, defineQmRewardRow(), HTMLElementTagNameMap, QmRewardEventDetail, QmRewardRow, QmRewardRowArgs, property, QmRewardRow (+15 more)

### Community 15 - "Public Branch Mapping"
Cohesion: 0.12
Nodes (30): normalizeTenantHost(), mapBranch(), parseSocialLinks(), createTranslationFieldMap(), mapPublicCategories(), PublicBranch, PublicBranchPhoto, PublicBranchSchedule (+22 more)

### Community 16 - "Public Menu Mapping"
Cohesion: 0.11
Nodes (30): createAllergensByDish(), createAvailabilityByDish(), createExtrasByDish(), createTagsByDish(), createVariantGroupsByDish(), mapPublicDishes(), translateField(), TranslationFieldMap (+22 more)

### Community 17 - "Project Docs & Concepts"
Cohesion: 0.08
Nodes (33): E2E_FIXED_OTP local-only flag, Bun+Turbo monorepo, Repository Guidelines (AGENTS.md), QMenut web fonts (OFL subsets), EU Regulation 1169/2011 (allergens), Legal notice (aviso legal, LSSI-CE), PostHog cookie-free analytics, Privacy policy (GDPR/LOPDGDD) (+25 more)

### Community 18 - "Field Web Component"
Cohesion: 0.09
Nodes (20): componentStyles, defineQmField(), HTMLElementTagNameMap, QmField, QmFieldArgs, QmFieldEventDetail, QmFieldType, property (+12 more)

### Community 19 - "Auth & Entitlements"
Cohesion: 0.13
Nodes (23): createAuth(), CreateAuthInput, fetch(), handleRequest(), BranchEntitlement, entitledPlanCode(), getBranchEntitlement(), GetBranchEntitlementInput (+15 more)

### Community 20 - "Public Locale Pages"
Cohesion: 0.18
Nodes (14): getLoyaltyProgramQueryOptions(), LoyaltyProgramQueryOptionsInput, getPublicMenuQueryOptions(), PublicMenuQueryOptionsInput, PublicMenuLanguage, useMenuContent(), buildHreflangAlternates(), BuildHreflangAlternatesInput (+6 more)

### Community 21 - "Billing & Stripe"
Cohesion: 0.08
Nodes (17): BranchSubscriptionRow, GetBranchSubscriptionInput, getStripeCustomer(), GetStripeCustomerInput, insertStripeCustomer(), InsertStripeCustomerInput, ListBranchSubscriptionsInput, PlanCode (+9 more)

### Community 22 - "Package Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, @hookform/resolvers, lit, @murga.ing/components, @qmenut/api, @qmenut/auth, @qmenut/permissions, @qmenut/ui (+21 more)

### Community 23 - "Admin Branch Settings UI"
Cohesion: 0.14
Nodes (21): Route, BranchOptionsInput, getBranchQueryOptions(), getSaveBranchMutationOptions(), useBranchController(), BranchMapperInput, BranchSettings, toBranchFormValues() (+13 more)

### Community 24 - "Content Versioning & Translations"
Cohesion: 0.08
Nodes (25): bumpPublicContentVersion(), bumpPublicContentVersionForBranch(), BumpPublicContentVersionForBranchInput, bumpPublicContentVersionForRestaurant(), BumpPublicContentVersionForRestaurantInput, PublicContentVersionInput, resolveBranchHostOrNull(), addLanguageInputSchema (+17 more)

### Community 25 - "Branch Settings Service"
Cohesion: 0.11
Nodes (20): BranchSettings, getBranchSettings(), GetBranchSettingsInput, saveBranchSettings(), SaveBranchSettingsInput, getVenueCode(), GetVenueCodeInput, undoLoyaltyAction() (+12 more)

### Community 26 - "TypeScript Config"
Cohesion: 0.07
Nodes (27): compilerOptions, baseUrl, experimentalDecorators, jsx, lib, paths, types, useDefineForClassFields (+19 more)

### Community 27 - "Loyalty Ledger"
Cohesion: 0.10
Nodes (15): LoyaltyTransactionType, AddStampInput, CancelRedemptionInput, CompensateTransactionInput, CreateRedemptionInput, ExpireStaleRedemptionsInput, FindPendingRedemptionInput, FindTransactionInput (+7 more)

### Community 28 - "Admin Pages & Forms"
Cohesion: 0.11
Nodes (16): LanguagesPage(), languageStatus(), EntityListCard(), FormCheckbox(), FormCheckboxProps, FormSelect(), FormSelectProps, SelectOption (+8 more)

### Community 29 - "Image Web Component"
Cohesion: 0.09
Nodes (13): componentStyles, defineQmImage(), HTMLElementTagNameMap, QmImage, QmImageArgs, property, componentStyles, defineQmDishModal() (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (25): compilerOptions, baseUrl, experimentalDecorators, jsx, lib, paths, types, useDefineForClassFields (+17 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (19): adminBranchesRouter, adminLoyaltyRouter, adminMenuRouter, adminPromotionsRouter, adminTenantRouter, AdminTenantContext, getTenantContext(), GetTenantContextInput (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (21): PublicMenuCategory, PublicMenuData, PublicMenuDish, ALLERGEN_META, AllergenCode, buildLogoLabel(), createPriceFormatter(), isAllergenCode() (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.08
Nodes (25): better-auth, default, types, dependencies, better-auth, drizzle-orm, devDependencies, @cloudflare/workers-types (+17 more)

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (25): culori, lit, @lit/react, dependencies, culori, lit, @lit/react, devDependencies (+17 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (19): componentStyles, defineQmAllergen(), HTMLElementTagNameMap, QmAllergen, QmAllergenArgs, property, componentStyles, defineQmBadge() (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (18): componentStyles, defineQmHeading(), HTMLElementTagNameMap, QmHeading, QmHeadingArgs, property, componentStyles, defineQmSkeleton() (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (17): Route, Route, branchIdSchema, requirePermission(), protectedProcedure, t, TenantContext, tenantProcedure (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.16
Nodes (17): useLoyaltyProgramController(), getSaveThemeMutationOptions(), getThemeQueryOptions(), ThemeOptionsInput, useThemeController(), ThemeConfig, ThemeMapperInput, toThemeFormValues() (+9 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (20): BranchInput, BranchTranslatableCatalog, EntityBelongsToRestaurantInput, RestaurantInput, TranslatableCategoryRow, TranslatableDishRow, TranslatableIngredientRow, TranslatableText (+12 more)

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (19): buildSortColumn(), GetLoyaltySummaryInput, GetVisitsSeriesInput, listLoyaltyCustomers(), ListLoyaltyCustomersInput, LoyaltyCustomerPage, LoyaltyCustomerRow, LoyaltyCustomerSortBy (+11 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (13): componentStyles, defineQmTab(), HTMLElementTagNameMap, QmTab, QmTabArgs, property, QmTab, componentStyles (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (18): Register, routeTree, createQueryClient(), getRouter(), Register, @tanstack/react-router, useLegalBranch(), getLegalContent() (+10 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (16): Route, Route, ROUTE_PATHS, getEnvString(), ApiWorkerBinding, createRawTrpcClient(), createServerTrpcCaller(), createTrpcOptionsProxy() (+8 more)

### Community 44 - "Community 44"
Cohesion: 0.14
Nodes (19): fetch(), buildCacheKey(), BuildCacheKeyInput, CACHEABLE_ROUTES, CacheStatus, CacheStatusResponseInput, EdgeCacheContext, getEdgeTtlSeconds() (+11 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (18): listCustomersInputSchema, programInputSchema, rejectRedemptionInputSchema, undoInputSchema, validateRedemptionInputSchema, venueCodeInputSchema, visitsChartInputSchema, insightsRouter (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.09
Nodes (21): dependencies, @qmenut/db, @qmenut/ui, devDependencies, @cloudflare/workers-types, typescript, wrangler, @cloudflare/workers-types (+13 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (15): formatCountdown(), LoyaltyController, LoyaltyExperience(), redemptionCopy(), RedemptionCopyInput, RedemptionState(), errorCode(), LoyaltyCard (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (21): compilerOptions, alwaysStrict, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, module, moduleResolution, noEmit (+13 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (19): applyQmTheme(), buildBadgeTokens(), BuildBadgeTokensArgs, buildNavTokens(), BuildNavTokensArgs, buildQmThemeVars(), buildTextScaleTokens(), PHOTO_GROUPS (+11 more)

### Community 50 - "Community 50"
Cohesion: 0.17
Nodes (14): Route, requestLoginOtp(), signInWithOtp(), useLoginController(), LoginPage(), loginFormSchema, LoginFormValues, assertAuthClientResult() (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (19): API_DIR, assertDomainFree(), buildSql(), CliOptions, esc(), escOrNull(), fail(), ids (+11 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (18): base64UrlDecode(), base64UrlEncode(), importHmacKey(), LoyaltyTokenPayload, loyaltyTokenPayloadSchema, signLoyaltyToken(), SignLoyaltyTokenInput, verifyLoyaltyToken() (+10 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (17): appFiles, importPluginCompat, importSettings, jsxA11yCompat, litFiles, packageFiles, pluginReactCompat, qualityTypeScriptRules (+9 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (18): AuthCookieMode, AuthSchema, BetterAuthInstance, createAuth(), CreateAuthOptions, CreateEmailWorkerOtpSenderOptions, DrizzleAdapterDatabase, EmailOtpSender (+10 more)

### Community 55 - "Community 55"
Cohesion: 0.11
Nodes (19): devDependencies, @tailwindcss/vite, @tanstack/router-plugin, @types/qrcode, @types/react, @types/react-dom, typescript, vite (+11 more)

### Community 56 - "Community 56"
Cohesion: 0.19
Nodes (11): TranslationsPage(), LoyaltyOperationsPage(), QR_SIZE_OPTIONS, QrPage(), ThemePage(), PageHeader(), EmptyState(), EmptyStateProps (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (13): ResolvedTenant, PublicTranslation, DeleteTranslationsForLanguageInput, ListTranslationsForLanguageInput, MarkTranslationsPendingUpdateInput, TenantLanguageIdsInput, TranslationField, TranslationRow (+5 more)

### Community 58 - "Community 58"
Cohesion: 0.16
Nodes (14): LoyaltyRewardType, CreateRewardInput, DishBelongsToRestaurantInput, getLoyaltyProgram(), GetRewardInput, ListRewardsInput, LoyaltyProgramRules, parseRules() (+6 more)

### Community 59 - "Community 59"
Cohesion: 0.11
Nodes (11): AdminBranchSummary, BranchPhotoRow, BranchScheduleRow, BranchSettingsWriteData, GetBranchInput, ListBranchesInput, ListBranchPhotosInput, ListBranchSchedulesInput (+3 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (13): container, Register, router, @tanstack/react-router, AppProviders(), routeTree, applyTheme(), getInitialTheme() (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (13): billingRouter, checkoutSchema, BLOCKING_STATUSES, createCheckoutSession(), CreateCheckoutSessionInput, createPortalSession(), CreatePortalSessionInput, BillingBranchOverview (+5 more)

### Community 62 - "Community 62"
Cohesion: 0.23
Nodes (7): test, callTrpcMutation(), callTrpcQuery(), TrpcResponse, expectCachedMenu(), getPublicMenu(), PublicMenuResponse

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (11): Route, insightsRoute, useLoyaltyInsightsController(), COLUMNS, INDICATORS, LoyaltyInsightsPage(), getVisitsRange(), CustomerSort (+3 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (11): useLoyaltyOperationsController(), LoyaltyOperationsContent(), aggregateWeekly(), downloadCustomersCsv(), escapeCsv(), formatCountdown(), formatDate(), formatRelativeAge() (+3 more)

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (16): costSchema, customerSortSchema, loyaltyProgramFormSchema, LoyaltyProgramFormValues, LoyaltyProgramResponse, optionalMoneySchema, percentageSchema, rewardFormSchema (+8 more)

### Community 66 - "Community 66"
Cohesion: 0.12
Nodes (17): dependencies, @qmenut/auth, @qmenut/db, @qmenut/permissions, @qmenut/ui, @sentry/cloudflare, @trpc/server, xss (+9 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (17): dependencies, i18next, posthog-js, @qmenut/api, @qmenut/ui, react, react-dom, @tanstack/react-query (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.12
Nodes (16): ^build, .wrangler/**, dependsOn, outputs, cache, dependsOn, cache, persistent (+8 more)

### Community 69 - "Community 69"
Cohesion: 0.17
Nodes (14): bumpPublicContentVersion(), getTheme(), publicContentVersionUrl(), putTheme(), PutThemeInput, TenantThemeInput, themeUrl(), branchIdSchema (+6 more)

### Community 70 - "Community 70"
Cohesion: 0.19
Nodes (10): FONT_ASSET_URLS, FONT_CSS_URLS, FONT_PRELOAD_URLS, FontPreloadUrls, TenantFontTheme, DEFAULT_CONFIG, QmThemeConfig, QmTemplateName (+2 more)

### Community 71 - "Community 71"
Cohesion: 0.15
Nodes (10): LanguageCodeInput, RestaurantInput, RestaurantLanguage, RestaurantLanguageInfo, SetLanguageActiveInput, branchSubscriptions, restaurantLanguages, restaurantStripeAccounts (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.23
Nodes (13): qrcode, qrFormSchema, QrFormValues, useQrController(), QrPanel(), buildMenuUrl(), buildQrFileBase(), downloadFile() (+5 more)

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (14): compilerOptions, baseUrl, lib, paths, types, exclude, extends, include (+6 more)

### Community 74 - "Community 74"
Cohesion: 0.13
Nodes (15): devDependencies, nitro, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react, wrangler (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (14): compilerOptions, lib, types, extends, files, @cloudflare/workers-types, DOM, DOM.Iterable (+6 more)

### Community 76 - "Community 76"
Cohesion: 0.25
Nodes (11): parseRecurringDays(), IdsInput, TenantIdsInput, TenantInput, mapDishPromotion(), mapPromotion(), PromotionCandidateRow, PromotionRow (+3 more)

### Community 77 - "Community 77"
Cohesion: 0.17
Nodes (10): componentStyles, defineQmCodeInput(), HTMLElementTagNameMap, QmCodeInput, QmCodeInputArgs, QmCodeInputEventDetail, QmCodeInputStatus, property (+2 more)

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (10): Route, getBillingOverviewQueryOptions(), getCheckoutMutationOptions(), getPortalMutationOptions(), redirectToBillingUrl(), useBillingController(), BillingPage(), PLAN_LABELS (+2 more)

### Community 79 - "Community 79"
Cohesion: 0.15
Nodes (14): @cloudflare/vitest-pool-workers, eslint-plugin-jsx-a11y, eslint-plugin-react, eslint-plugin-react-refresh, eslint-plugin-wc, devDependencies, @cloudflare/vitest-pool-workers, eslint-plugin-jsx-a11y (+6 more)

### Community 80 - "Community 80"
Cohesion: 0.14
Nodes (13): devDependencies, @playwright/test, @types/node, @types/node, name, private, scripts, cleanup (+5 more)

### Community 81 - "Community 81"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, types, exclude, extends, include, @cloudflare/workers-types, dist (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.14
Nodes (13): devDependencies, @types/bun, typescript, exports, @types/bun, typescript, name, private (+5 more)

### Community 83 - "Community 83"
Cohesion: 0.19
Nodes (8): componentStyles, defineQmRedeemWait(), HTMLElementTagNameMap, QmRedeemWait, QmRedeemWaitArgs, QmRedeemWaitStatus, property, QmRedeemWait

### Community 84 - "Community 84"
Cohesion: 0.14
Nodes (13): compilerOptions, experimentalDecorators, lib, useDefineForClassFields, exclude, extends, include, dist (+5 more)

### Community 85 - "Community 85"
Cohesion: 0.15
Nodes (13): devDependencies, @cloudflare/workers-types, drizzle-kit, @types/bun, @types/node, typescript, wrangler, @cloudflare/workers-types (+5 more)

### Community 86 - "Community 86"
Cohesion: 0.18
Nodes (11): FieldName, listTranslations(), ListTranslationsInput, StatsAccumulator, TranslatableCategoryEntity, TranslatableDishEntity, TranslatableEntity, TranslatableField (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.15
Nodes (12): dependencies, drizzle-orm, @qmenut/permissions, drizzle-orm, name, private, scripts, build (+4 more)

### Community 88 - "Community 88"
Cohesion: 0.21
Nodes (8): componentStyles, defineQmLoyaltySignup(), HTMLElementTagNameMap, QmLoyaltyEmailEventDetail, QmLoyaltySignup, QmLoyaltySignupArgs, property, QmLoyaltySignup

### Community 89 - "Community 89"
Cohesion: 0.17
Nodes (3): ApiContext, MutationContext, LoyaltyInsightsSearch

### Community 90 - "Community 90"
Cohesion: 0.17
Nodes (12): scripts, build, check, db:cleanup:e2e, db:migrate, db:migrate:local, db:migrations:list, db:seed:e2e (+4 more)

### Community 91 - "Community 91"
Cohesion: 0.23
Nodes (11): getInsightsVisitsChart(), GetInsightsVisitsChartInput, getLoyaltyInsightsSummary(), getLoyaltyReturn(), listInsightsCustomers(), ListInsightsCustomersInput, LoyaltyReturnPoint, LoyaltyReturnResult (+3 more)

### Community 92 - "Community 92"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, types, exclude, extends, include, @cloudflare/workers-types, dist (+3 more)

### Community 93 - "Community 93"
Cohesion: 0.26
Nodes (8): useContactContent(), mapMockContactContent(), MOCK_CONTACT_CONTENT, MockContactContent, MockContactLocation, ContactContentViewModel, ContactFormViewModel, ContactLocationViewModel

### Community 94 - "Community 94"
Cohesion: 0.24
Nodes (12): apps/admin (Owner Dashboard SPA), apps/api (qmenut-api tRPC Worker), Bun/Turbo Monorepo Layout, One-Web-Worker-Per-Tenant Deploy Model, Shared KV Namespace ID Convention, apps/tenant-config (KV Writer Worker), TENANT_THEME KV Namespace, apps/web (Public Menu SSR Worker) (+4 more)

### Community 95 - "Community 95"
Cohesion: 0.17
Nodes (12): scripts, audit, build, check, dev, format, lint, lint:eslint (+4 more)

### Community 96 - "Community 96"
Cohesion: 0.30
Nodes (10): isBodyFontId(), isFontId(), isHeadingFontId(), QM_FONT_CATALOG, QmFontCatalogEntry, QmFontRole, buildDefaultTenantThemeConfig(), isColor() (+2 more)

### Community 97 - "Community 97"
Cohesion: 0.27
Nodes (7): UndoNotice, getUndoError(), getValidationError(), PendingRedemption, getErrorMessage(), isForbiddenError(), RouteErrorState()

### Community 98 - "Community 98"
Cohesion: 0.36
Nodes (10): Env, fetch(), handlePublicContentVersionRequest(), handleRequest(), handleThemeRequest(), isAuthorized(), jsonResponse(), parseThemeBody() (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.29
Nodes (7): usePromosContent(), mapMockPromosContent(), MOCK_PROMOS_CONTENT, MockPromo, MockPromosContent, PromosContentViewModel, PromoViewModel

### Community 100 - "Community 100"
Cohesion: 0.22
Nodes (11): Admin Auth Client, Admin Owner Dashboard, Per-Feature Folder Convention (pages/controller/api/mappers/types), tRPC Procedure Types (public/protected/tenant), tenantProcedure, tRPC appRouter Composition, protectedProcedure (session), Admin Isolation Path (by session membership) (+3 more)

### Community 101 - "Community 101"
Cohesion: 0.20
Nodes (11): Anti-Abuse (rate limit + throttle), Loyalty Return Estimate (ticket medio), Presence-Over-Approval Principle, QR Scanning Removed (2026-07-10), Venue Code Design Rationale, Loyalty Card Token (localStorage HMAC), Email-Only Customer Identity, Loyalty Transactions Ledger (+3 more)

### Community 102 - "Community 102"
Cohesion: 0.20
Nodes (11): DeepL Machine Translation Service, Restaurant Languages Configuration, Menu Entity Translations, assertBranchAccess Guard, Categories & Dishes (branch-scoped), Menu Management CRUD, Public Menu Read Path, NOT_FOUND-Not-FORBIDDEN Cross-Tenant Guard (+3 more)

### Community 103 - "Community 103"
Cohesion: 0.31
Nodes (9): createBestPromotionMap(), getLocalDayAndMinute(), isMinuteInWindow(), ISO_DAY, isPromotionLikeActiveNow(), PromotionCandidateLike, PromotionLike, shouldReplacePromotion() (+1 more)

### Community 104 - "Community 104"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, check, dev, preview, type (+1 more)

### Community 105 - "Community 105"
Cohesion: 0.20
Nodes (10): exports, ./repositories/admin-categories.repository, ./repositories/customers.repository, ./repositories/loyalty-ledger.repository, import, types, import, types (+2 more)

### Community 106 - "Community 106"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, types, extends, files, ESNext, src/index.ts, ../../tsconfig.json (+1 more)

### Community 107 - "Community 107"
Cohesion: 0.20
Nodes (10): import, types, import, types, exports, ./components/qm-featured, ./components/qm-reward-row, ./theme/derive (+2 more)

### Community 108 - "Community 108"
Cohesion: 0.22
Nodes (8): componentStyles, defineQmButton(), HTMLElementTagNameMap, QmButton, QmButtonArgs, QmButtonSize, QmButtonVariant, property

### Community 109 - "Community 109"
Cohesion: 0.25
Nodes (5): Route, LoyaltyProgramPage(), ProgramController, TYPE_LABELS, TYPE_OPTIONS

### Community 110 - "Community 110"
Cohesion: 0.22
Nodes (8): exports, ./router, name, private, import, types, type, version

### Community 111 - "Community 111"
Cohesion: 0.22
Nodes (8): name, packageManager, private, type, workspaces, apps/*, e2e, packages/*

### Community 112 - "Community 112"
Cohesion: 0.46
Nodes (7): ensureLoaded(), isEnabled(), load, queue, QueuedEvent, scheduleAnalyticsLoad(), track()

### Community 113 - "Community 113"
Cohesion: 0.32
Nodes (6): clientTenantContextCache, getCachedTenantContext(), getTenantContext, TenantContext, QmTemplatePreset, QmTenantThemeConfig

### Community 114 - "Community 114"
Cohesion: 0.25
Nodes (8): Lit SSR DOM Shim, Mock-Backed Promos/Contacto Pages, Public Menu SSR Worker, Web tRPC Client (binding + HTTP fallback), Cloudflare Service Bindings, Locale-Prefixed Public Routes + hreflang, Promotions Definitions, Public Promos Page Mock (MVP1 Gap)

### Community 115 - "Community 115"
Cohesion: 0.32
Nodes (7): CustomerCardState, findCustomerByEmail(), FindCustomerByEmailInput, getCardState(), GetCardStateInput, upsertCustomerCard(), UpsertCustomerCardInput

### Community 116 - "Community 116"
Cohesion: 0.29
Nodes (6): componentStyles, defineQmEyebrow(), HTMLElementTagNameMap, QmEyebrow, QmEyebrowArgs, property

### Community 119 - "Community 119"
Cohesion: 0.33
Nodes (3): stripe, StripeProvider, stripe

### Community 120 - "Community 120"
Cohesion: 0.29
Nodes (6): minuteSchema, nullableText, photoRowSchema, saveBranchSettingsSchema, scheduleRowSchema, supportedTimeZones

### Community 121 - "Community 121"
Cohesion: 0.29
Nodes (7): scripts, build, check, dev, serve:cafe, serve:fine, serve:tapas

### Community 122 - "Community 122"
Cohesion: 0.29
Nodes (7): Cross-Origin Cookie Sharing (Better Auth), Clerk Auth in BFF (abandoned), Abandoned GraphQL/BFF-Gateway Design, Private GraphQL Worker (abandoned), Better Auth Email-OTP Login, EMAIL_WORKER OTP Delivery, Sign-Up Disabled (Provisioned Accounts)

### Community 123 - "Community 123"
Cohesion: 0.33
Nodes (7): Stripe Idempotency Keys (checkout/customer), Admin & Billing MVP1 (archived), Stripe Checkout + Customer Portal, Branch Entitlement / requirePlan, Plan Catalog (basic/business env price ids), Stripe Subscriptions Per Branch, Webhook-Driven Subscription State (syncSubscriptionState)

### Community 124 - "Community 124"
Cohesion: 0.38
Nodes (7): branches.customDomain Routing Key, normalizeTenantHost, resolveTenantFromRequest / resolveTenantByHost, resolveSsrTenantHost, Host-Based Tenant Resolution, Denormalized restaurantId+branchId Defense-in-Depth, Public Isolation Path (by host)

### Community 125 - "Community 125"
Cohesion: 0.29
Nodes (7): devDependencies, @cloudflare/workers-types, @types/bun, typescript, @cloudflare/workers-types, @types/bun, typescript

### Community 126 - "Community 126"
Cohesion: 0.33
Nodes (6): LoyaltyProgramState, LoyaltyRewardView, LoyaltyTransactionResult, PendingRedemptionRow, RedemptionDetail, RedemptionStatus

### Community 127 - "Community 127"
Cohesion: 0.33
Nodes (7): @qmenut/ui Component Review Guidelines, Stateless controlled-component architecture, FocusTrap, FocusableMixin, QmElement base class, qm- prefixed custom events, Shadow DOM encapsulation (no cross-component styling)

### Community 128 - "Community 128"
Cohesion: 0.50
Nodes (5): main.tsx Module Entrypoint, data-mc-theme Theme Attribute, QMenut Admin HTML Shell, React Root Mount Element, Inline Theme Bootstrap Script

### Community 129 - "Community 129"
Cohesion: 0.50
Nodes (3): Route, LoyaltyLayout(), TABS

### Community 130 - "Community 130"
Cohesion: 0.40
Nodes (3): Route, Route, CategoryEditorPage()

### Community 131 - "Community 131"
Cohesion: 0.60
Nodes (4): applyCorsHeaders(), ApplyCorsHeadersInput, createOptionsResponse(), resolveOrigin()

### Community 132 - "Community 132"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 133 - "Community 133"
Cohesion: 0.40
Nodes (3): MenuDishList(), MenuDishListProps, MenuSectionProps

### Community 135 - "Community 135"
Cohesion: 0.67
Nodes (3): getLanguageCatalogEntry(), LANGUAGE_CATALOG, LanguageCatalogEntry

### Community 136 - "Community 136"
Cohesion: 0.67
Nodes (3): filter, sanitizeDescription(), sanitizeNullableDescription()

### Community 137 - "Community 137"
Cohesion: 0.50
Nodes (3): QmHeroHeaderProps, ScrollCompactHeroHeader(), ScrollCompactHeroHeaderProps

### Community 138 - "Community 138"
Cohesion: 0.50
Nodes (4): Drizzle ORM over D1, Hand-Written SQL Migrations, Money Stored as Integer Cents, Repository Layer (packages/db)

### Community 139 - "Community 139"
Cohesion: 0.67
Nodes (3): Apache License 2.0 (frontend-design), Frontend Design skill, Avoid templated AI-default looks

### Community 143 - "Community 143"
Cohesion: 0.67
Nodes (3): @tanstack/eslint-plugin-query, @tanstack/eslint-plugin-router, @tanstack/eslint-plugin-query

### Community 144 - "Community 144"
Cohesion: 0.67
Nodes (3): import, types, ./client

### Community 145 - "Community 145"
Cohesion: 0.67
Nodes (3): import, types, ./domain/promotions

### Community 146 - "Community 146"
Cohesion: 0.67
Nodes (3): import, types, ./domain/tenant

### Community 147 - "Community 147"
Cohesion: 0.67
Nodes (3): ./mappers/branch.mapper, import, types

### Community 148 - "Community 148"
Cohesion: 0.67
Nodes (3): ./mappers/promotion.mapper, import, types

### Community 149 - "Community 149"
Cohesion: 0.67
Nodes (3): ./mappers/public-menu.mapper, import, types

### Community 150 - "Community 150"
Cohesion: 0.67
Nodes (3): ./models/branch, import, types

### Community 151 - "Community 151"
Cohesion: 0.67
Nodes (3): ./models/loyalty, import, types

### Community 152 - "Community 152"
Cohesion: 0.67
Nodes (3): ./models/promotion, import, types

### Community 153 - "Community 153"
Cohesion: 0.67
Nodes (3): ./models/public-menu, import, types

### Community 154 - "Community 154"
Cohesion: 0.67
Nodes (3): ./models/translation, import, types

### Community 155 - "Community 155"
Cohesion: 0.67
Nodes (3): ./repositories/admin-branches.repository, import, types

### Community 156 - "Community 156"
Cohesion: 0.67
Nodes (3): ./repositories/admin-dishes.repository, import, types

### Community 157 - "Community 157"
Cohesion: 0.67
Nodes (3): ./repositories/admin-menu-taxonomy.repository, import, types

### Community 158 - "Community 158"
Cohesion: 0.67
Nodes (3): ./repositories/admin-promotions.repository, import, types

### Community 159 - "Community 159"
Cohesion: 0.67
Nodes (3): ./repositories/admin-translations.repository, import, types

### Community 160 - "Community 160"
Cohesion: 0.67
Nodes (3): ./repositories/billing.repository, import, types

### Community 161 - "Community 161"
Cohesion: 0.67
Nodes (3): ./repositories/loyalty-admin.repository, import, types

### Community 162 - "Community 162"
Cohesion: 0.67
Nodes (3): ./repositories/loyalty-insights.repository, import, types

### Community 163 - "Community 163"
Cohesion: 0.67
Nodes (3): ./repositories/promotions.repository, import, types

### Community 164 - "Community 164"
Cohesion: 0.67
Nodes (3): ./repositories/public-menu.repository, import, types

### Community 165 - "Community 165"
Cohesion: 0.67
Nodes (3): ./repositories/restaurant-languages.repository, import, types

### Community 166 - "Community 166"
Cohesion: 0.67
Nodes (3): ./repositories/restaurant-users.repository, import, types

### Community 167 - "Community 167"
Cohesion: 0.67
Nodes (3): ./repositories/restaurants.repository, import, types

### Community 168 - "Community 168"
Cohesion: 0.67
Nodes (3): ./repositories/tenant.repository, import, types

### Community 169 - "Community 169"
Cohesion: 0.67
Nodes (3): ./repositories/translations.repository, import, types

### Community 170 - "Community 170"
Cohesion: 0.67
Nodes (3): ./schema, import, types

### Community 171 - "Community 171"
Cohesion: 0.67
Nodes (3): ./schema/auth, import, types

### Community 172 - "Community 172"
Cohesion: 0.67
Nodes (3): ./schema/billing, import, types

### Community 173 - "Community 173"
Cohesion: 0.67
Nodes (3): ./schema/branches, import, types

### Community 174 - "Community 174"
Cohesion: 0.67
Nodes (3): ./schema/customers, import, types

### Community 175 - "Community 175"
Cohesion: 0.67
Nodes (3): ./schema/loyalty, import, types

### Community 176 - "Community 176"
Cohesion: 0.67
Nodes (3): ./schema/menu, import, types

### Community 177 - "Community 177"
Cohesion: 0.67
Nodes (3): ./schema/promotions, import, types

### Community 178 - "Community 178"
Cohesion: 0.67
Nodes (3): ./schema/restaurants, import, types

### Community 179 - "Community 179"
Cohesion: 0.67
Nodes (3): ./schema/translations, import, types

### Community 180 - "Community 180"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-allergen

### Community 181 - "Community 181"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-badge

### Community 182 - "Community 182"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-button

### Community 183 - "Community 183"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-chip

### Community 184 - "Community 184"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-code-input

### Community 185 - "Community 185"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-code-input/react

### Community 186 - "Community 186"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-contact-panel

### Community 187 - "Community 187"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-contact-panel/react

### Community 188 - "Community 188"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-dish-extras

### Community 189 - "Community 189"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-dish-modal

### Community 190 - "Community 190"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-dish-modal/react

### Community 191 - "Community 191"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-dish-row

### Community 192 - "Community 192"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-divider

### Community 193 - "Community 193"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-eyebrow

### Community 194 - "Community 194"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-field-group

### Community 195 - "Community 195"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-field-group/react

### Community 196 - "Community 196"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-field

### Community 197 - "Community 197"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-field/react

### Community 198 - "Community 198"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-heading

### Community 199 - "Community 199"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-hero-header

### Community 200 - "Community 200"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-hero-header/react

### Community 201 - "Community 201"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-image

### Community 202 - "Community 202"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-lang

### Community 203 - "Community 203"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-lang/react

### Community 204 - "Community 204"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-location

### Community 205 - "Community 205"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-loyalty-card

### Community 206 - "Community 206"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-loyalty-card/react

### Community 207 - "Community 207"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-loyalty-signup

### Community 208 - "Community 208"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-loyalty-signup/react

### Community 209 - "Community 209"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-menu-list

### Community 210 - "Community 210"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-nav-bar

### Community 211 - "Community 211"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-page-header

### Community 212 - "Community 212"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-page-header/react

### Community 213 - "Community 213"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-pin

### Community 214 - "Community 214"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-price

### Community 215 - "Community 215"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-promo

### Community 216 - "Community 216"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-promo-list

### Community 217 - "Community 217"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-redeem-wait

### Community 218 - "Community 218"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-redeem-wait/react

### Community 219 - "Community 219"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-reward-row/react

### Community 220 - "Community 220"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-section-header

### Community 221 - "Community 221"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-section-num

### Community 222 - "Community 222"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-skeleton

### Community 223 - "Community 223"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-stamp-grid

### Community 224 - "Community 224"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-tab

### Community 225 - "Community 225"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-tab/react

### Community 226 - "Community 226"
Cohesion: 0.67
Nodes (3): import, types, ./components/qm-wordmark

### Community 227 - "Community 227"
Cohesion: 0.67
Nodes (3): ./jsx-types, import, types

### Community 228 - "Community 228"
Cohesion: 0.67
Nodes (3): ./theme/apply-theme, import, types

### Community 229 - "Community 229"
Cohesion: 0.67
Nodes (3): ./theme/font-catalog, import, types

### Community 230 - "Community 230"
Cohesion: 0.67
Nodes (3): ./theme/presets, import, types

### Community 231 - "Community 231"
Cohesion: 0.67
Nodes (3): ./theme/tenant-theme-config, import, types

### Community 232 - "Community 232"
Cohesion: 0.67
Nodes (3): ./theme/tokens, import, types

## Knowledge Gaps
- **1036 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1031 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `state` connect `Price Web Component` to `Community 112`, `Image Web Component`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `DrizzleDb` connect `Admin Data Repositories` to `Loyalty Card Operations`, `Admin Menu Router`, `Promotion Schemas & Router`, `Public Branch Mapping`, `Auth & Entitlements`, `Billing & Stripe`, `Content Versioning & Translations`, `Branch Settings Service`, `Loyalty Ledger`, `Community 31`, `Community 37`, `Community 39`, `Community 40`, `Community 45`, `Community 57`, `Community 58`, `Community 59`, `Community 61`, `Community 71`, `Community 76`, `Community 86`, `Community 91`, `Community 115`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `AppRouter` connect `Admin Branch Settings UI` to `Community 32`, `Community 65`, `Admin Menu/Promotion Forms`, `Admin Promotions API`, `Community 38`, `Auth Shell & Branch Store`, `Admin Languages`, `Community 43`, `Community 31`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1036 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Price Web Component` be split into smaller, more focused modules?**
  _Cohesion score 0.062146892655367235 - nodes in this community are weakly interconnected._
- **Should `Admin Route Tree` be split into smaller, more focused modules?**
  _Cohesion score 0.043834015195791935 - nodes in this community are weakly interconnected._
- **Should `Admin Data Repositories` be split into smaller, more focused modules?**
  _Cohesion score 0.04900181488203267 - nodes in this community are weakly interconnected._
