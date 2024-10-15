---
outline: deep
---

# 🛠️ `useI18n` Composable

The `useI18n` composable in `Nuxt I18n Micro` is designed to provide an easy and efficient way to access internationalization functionalities within your Nuxt application. It offers a variety of methods to handle localization, translation, and route management based on the current locale.

## ⚙️ Return Values

The `useI18n` composable returns an object containing several key methods and properties for managing internationalization:

### `$getLocale`

-   **Type**: `() => Locale`
-   **Description**: Returns the current locale of the application.
-   **Example**:
    ```js
    const { $getLocale } = useI18n()
    const locale = $getLocale()
    console.log(locale) // e.g., '{ code: 'en', iso: 'en-US' }'
    ```

### `$getLocales`

-   **Type**: `() => Locale[]`
-   **Description**: Returns an array of all available locales in the application.
-   **Example**:
    ```js
    const { $getLocales } = useI18n()
    const locales = $getLocales()
    console.log(locales) // e.g., [{ code: 'en', iso: 'en-US' }, { code: 'fr', iso: 'fr-FR' }]
    ```

### `$t`

-   **Type**: `<T extends Record<string, string | number | boolean>>(key: string, params?: T, defaultValue?: string) => string | number | boolean | Translations | PluralTranslations | unknown[] | unknown | null`
-   **Description**: Translates a given key to the corresponding localized string, optionally replacing placeholders with provided parameters and falling back to a default value if the key is not found.
-   **Example**:
    ```js
    const { $t } = useI18n()
    const greeting = $t('hello', { name: 'John' }, 'Hello!')
    console.log(greeting) // e.g., 'Hello, John'
    ```

### `$tc`

-   **Type**: `(key: string, count: number, defaultValue?: string) => string`
-   **Description**: Translates a given key with pluralization based on the provided count, optionally falling back to a default value if the key is not found.
-   **Example**:
    ```js
    const { $tc } = useI18n()
    const message = $tc('apples', 3, '3 apples')
    console.log(message) // e.g., '3 apples'
    ```

### `$has`

-   **Type**: `(key: string) => boolean`
-   **Description**: Checks if a translation key exists for the current locale.
-   **Example**:
    ```js
    const { $has } = useI18n()
    const exists = $has('hello')
    console.log(exists) // e.g., true
    ```

### `$mergeTranslations`

-   **Type**: `(newTranslations: Translations) => void`
-   **Description**: Merges additional translations into the existing ones for the current locale.
-   **Example**:
    ```js
    const { $mergeTranslations } = useI18n()
    $mergeTranslations({
        hello: 'Hello World'
    })
    ```

### `$switchLocale`

-   **Type**: `(locale: string) => void`
-   **Description**: Switches the application's locale to the specified locale.
-   **Example**:
    ```js
    const { $switchLocale } = useI18n()
    $switchLocale('fr')
    ```

### `$localeRoute`

-   **Type**: `(to: RouteLocationRaw, locale?: string) => RouteLocationRaw`
-   **Description**: Generates a localized route based on the specified route and optionally the specified locale.
-   **Example**:
    ```js
    const { $localeRoute } = useI18n()
    const route = $localeRoute('/about', 'fr')
    ```

### `$loadPageTranslations`

-   **Type**: `(locale: string, routeName: string) => Promise<void>`
-   **Description**: Loads translations for the specified page and locale, enabling lazy-loading of translations.
-   **Example**:
    ```js
    const { $loadPageTranslations } = useI18n()
    await $loadPageTranslations('fr', 'home')
    ```

## 🛠️ Example Usages

### Basic Locale Retrieval

Retrieve the current locale of the application.

```js
const { $getLocaleCode } = useI18n()
const locale = $getLocaleCode()
```

### Translation with Parameters

Translate a string with dynamic parameters, with a fallback default value.

```js
const { $t } = useI18n()
const welcomeMessage = $t('welcome', { name: 'Jane' }, 'Welcome!')
```

### Switching Locales

Switch the application to a different locale.

```js
const { $switchLocale } = useI18n()
$switchLocale('de')
```

### Generating a Localized Route

Generate a route localized to the current or specified locale.

```js
const { $localeRoute } = useI18n()
const route = $localeRoute('/about', 'fr')
```

### Loading Page-Specific Translations

Lazy-load translations for a specific page and locale.

```js
const { $loadPageTranslations } = useI18n()
await $loadPageTranslations('de', 'dashboard')
```
