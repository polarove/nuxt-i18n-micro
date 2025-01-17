import path from 'node:path'
import { readFileSync } from 'node:fs'
import type { NuxtPage } from '@nuxt/schema'
import type { GlobalLocaleRoutes, Locale } from './types'
import {
  extractDefineI18nRouteConfig,
  normalizePath,
  isLocaleDefault,
  isPageRedirectOnly,
  cloneArray,
  buildRouteName,
  shouldAddLocalePrefix,
  buildFullPath,
  removeLeadingSlash,
} from './utils'

// Класс PageManager
export class PageManager {
  locales: Locale[]
  defaultLocale: Locale
  includeDefaultLocaleRoute: boolean
  localizedPaths: { [key: string]: { [locale: string]: string } } = {}
  activeLocaleCodes: string[]
  globalLocaleRoutes: Record<string, Record<string, string> | false | boolean>

  constructor(locales: Locale[], defaultLocaleCode: string, includeDefaultLocaleRoute: boolean, globalLocaleRoutes: GlobalLocaleRoutes) {
    this.locales = locales
    this.defaultLocale = this.findLocaleByCode(defaultLocaleCode) || { code: defaultLocaleCode }
    this.includeDefaultLocaleRoute = includeDefaultLocaleRoute
    this.activeLocaleCodes = this.computeActiveLocaleCodes()
    this.globalLocaleRoutes = globalLocaleRoutes || {}
  }

  private findLocaleByCode(code: string): Locale | undefined {
    return this.locales.find(locale => locale.code === code)
  }

  private computeActiveLocaleCodes(): string[] {
    return this.locales
      .filter(locale => locale.code !== this.defaultLocale.code || this.includeDefaultLocaleRoute)
      .map(locale => locale.code)
  }

  public extendPages(pages: NuxtPage[], rootDir: string) {
    this.localizedPaths = this.extractLocalizedPaths(pages, rootDir)

    const additionalRoutes: NuxtPage[] = []
    pages.forEach((page) => {
      const customRoute = this.globalLocaleRoutes[page.name ?? ''] ?? null

      // If globalLocaleRoutes for this page is false, skip localization
      if (customRoute === false) {
        return
      }

      // Check if the page has custom routes in globalLocaleRoutes
      if (customRoute && typeof customRoute === 'object') {
        // Add routes based on custom globalLocaleRoutes
        this.addCustomGlobalLocalizedRoutes(page, customRoute, additionalRoutes)
      }
      else {
        // Default behavior: localize the page as usual
        this.localizePage(page, additionalRoutes)
      }
    })

    pages.push(...additionalRoutes)
  }

  private extractLocalizedPaths(
    pages: NuxtPage[],
    rootDir: string,
    parentPath = '',
  ): { [key: string]: { [locale: string]: string } } {
    const localizedPaths: { [key: string]: { [locale: string]: string } } = {}

    pages.forEach((page) => {
      const pageName = page.name ?? ''
      const globalLocalePath = this.globalLocaleRoutes[pageName]

      if (!globalLocalePath) {
        // Fallback to extracting localized paths from the page file content (existing functionality)
        if (page.file) {
          const filePath = path.resolve(rootDir, page.file)
          const fileContent = readFileSync(filePath, 'utf-8')
          const i18nRouteConfig = extractDefineI18nRouteConfig(fileContent, filePath)

          if (i18nRouteConfig?.localeRoutes) {
            const normalizedFullPath = normalizePath(path.join(parentPath, page.path))
            localizedPaths[normalizedFullPath] = i18nRouteConfig.localeRoutes
          }
        }
      }
      else if (typeof globalLocalePath === 'object') {
        // Use globalLocaleRoutes if defined
        const normalizedFullPath = normalizePath(path.join(parentPath, page.path))
        localizedPaths[normalizedFullPath] = globalLocalePath
      }

      if (page.children?.length) {
        const parentFullPath = normalizePath(path.join(parentPath, page.path))
        Object.assign(localizedPaths, this.extractLocalizedPaths(page.children, rootDir, parentFullPath))
      }
    })

    return localizedPaths
  }

  private addCustomGlobalLocalizedRoutes(
    page: NuxtPage,
    customRoutePaths: Record<string, string>,
    additionalRoutes: NuxtPage[],
  ) {
    this.locales.forEach((locale) => {
      const customPath = customRoutePaths[locale.code]
      if (!customPath) return

      const isDefaultLocale = isLocaleDefault(locale, this.defaultLocale, this.includeDefaultLocaleRoute)
      if (isDefaultLocale) {
        // Modify the page path if it's the default locale
        page.path = normalizePath(customPath)
      }
      else {
        // Create a new localized route for this locale
        additionalRoutes.push(this.createLocalizedRoute(page, [locale.code], page.children ?? [], true, customPath))
      }
    })
  }

  private localizePage(
    page: NuxtPage,
    additionalRoutes: NuxtPage[],
  ) {
    if (isPageRedirectOnly(page)) return

    const originalChildren = cloneArray(page.children ?? [])
    const normalizedFullPath = normalizePath(page.path)
    const localeCodesWithoutCustomPaths = this.filterLocaleCodesWithoutCustomPaths(normalizedFullPath)

    if (localeCodesWithoutCustomPaths.length) {
      additionalRoutes.push(this.createLocalizedRoute(page, localeCodesWithoutCustomPaths, originalChildren, false))
    }

    this.addCustomLocalizedRoutes(page, normalizedFullPath, originalChildren, additionalRoutes)
    this.adjustRouteForDefaultLocale(page, originalChildren)
  }

  private filterLocaleCodesWithoutCustomPaths(fullPath: string): string[] {
    return this.activeLocaleCodes.filter(code => !this.localizedPaths[fullPath]?.[code])
  }

  adjustRouteForDefaultLocale(page: NuxtPage, originalChildren: NuxtPage[]) {
    const defaultLocalePath = this.localizedPaths[page.path]?.[this.defaultLocale.code]
    if (defaultLocalePath) {
      page.path = normalizePath(defaultLocalePath)
    }

    // Создаем копию текущих детей
    const currentChildren = page.children ? [...page.children] : []

    if (originalChildren.length) {
      const newName = normalizePath(path.join('/', page.name ?? ''))
      const localizedChildren = this.mergeChildren(originalChildren, newName, [this.defaultLocale.code])

      // Мапа для поиска детей по имени
      const childrenMap = new Map(currentChildren.map(child => [child.name, child]))

      localizedChildren.forEach((localizedChild) => {
        if (childrenMap.has(localizedChild.name)) {
          // Обновляем существующий элемент, используя объект из Map
          const existingChild = childrenMap.get(localizedChild.name)
          if (existingChild) {
            Object.assign(existingChild, localizedChild)
          }
        }
        else {
          // Добавляем новый элемент, если его нет
          currentChildren.push(localizedChild)
        }
      })

      // Присваиваем обновленный массив детей обратно в page.children
      page.children = currentChildren
    }
  }

  private mergeChildren(
    originalChildren: NuxtPage[],
    parentPath: string,
    localeCodes: string[],
  ): NuxtPage[] {
    const localizedChildren = this.createLocalizedChildren(originalChildren, parentPath, localeCodes, false)
    return [...originalChildren, ...localizedChildren]
  }

  private addCustomLocalizedRoutes(
    page: NuxtPage,
    fullPath: string,
    originalChildren: NuxtPage[],
    additionalRoutes: NuxtPage[],
  ) {
    this.locales.forEach((locale) => {
      const customPath = this.localizedPaths[fullPath]?.[locale.code]
      if (!customPath) return

      const isDefaultLocale = isLocaleDefault(locale, this.defaultLocale, this.includeDefaultLocaleRoute)
      if (isDefaultLocale) {
        page.children = this.createLocalizedChildren(originalChildren, '', [locale.code], false)
      }
      else {
        additionalRoutes.push(this.createLocalizedRoute(page, [locale.code], originalChildren, true, customPath))
      }
    })
  }

  private createLocalizedChildren(
    routes: NuxtPage[],
    parentPath: string,
    localeCodes: string[],
    modifyName = true,
    addLocalePrefix = false,
  ): NuxtPage[] {
    return routes.flatMap(route => this.createLocalizedVariants(route, parentPath, localeCodes, modifyName, addLocalePrefix))
  }

  private createLocalizedVariants(
    route: NuxtPage,
    parentPath: string,
    localeCodes: string[],
    modifyName: boolean,
    addLocalePrefix: boolean,
  ): NuxtPage[] {
    const routePath = normalizePath(route.path)
    const fullPath = normalizePath(path.join(parentPath, routePath))
    const customLocalePaths = this.localizedPaths[fullPath]
    const localizedChildren = this.createLocalizedChildren(route.children ?? [], fullPath, localeCodes, modifyName)

    return localeCodes.map(locale => this.createLocalizedChildRoute(route, routePath, locale, customLocalePaths, localizedChildren, modifyName, addLocalePrefix))
  }

  private createLocalizedRoute(
    page: NuxtPage,
    localeCodes: string[],
    originalChildren: NuxtPage[],
    isCustom: boolean,
    customPath: string = '',
  ): NuxtPage {
    const routePath = this.buildRoutePath(localeCodes, page.path, customPath, isCustom)
    const routeName = buildRouteName(page.name ?? '', localeCodes[0], isCustom)

    return {
      ...page,
      children: this.createLocalizedChildren(originalChildren, page.path, localeCodes, true),
      path: routePath,
      name: routeName,
    }
  }

  private createLocalizedChildRoute(
    route: NuxtPage,
    routePath: string,
    locale: string,
    customLocalePaths: { [locale: string]: string } | undefined,
    children: NuxtPage[],
    modifyName: boolean,
    addLocalePrefix: boolean,
  ): NuxtPage {
    const finalPath = this.buildLocalizedRoutePath(routePath, locale, customLocalePaths, addLocalePrefix)
    const routeName = this.buildLocalizedRouteName(route.name ?? '', locale, modifyName)

    return {
      ...route,
      name: routeName,
      path: removeLeadingSlash(finalPath),
      children: children,
    }
  }

  private buildLocalizedRoutePath(
    routePath: string,
    locale: string,
    customLocalePaths: { [locale: string]: string } | undefined,
    addLocalePrefix: boolean,
  ): string {
    const basePath = customLocalePaths?.[locale] || routePath
    const normalizedBasePath = normalizePath(basePath)

    return shouldAddLocalePrefix(locale, this.defaultLocale, addLocalePrefix, this.includeDefaultLocaleRoute)
      ? buildFullPath(locale, normalizedBasePath)
      : normalizedBasePath
  }

  private buildLocalizedRouteName(baseName: string, locale: string, modifyName: boolean): string {
    return modifyName && !isLocaleDefault(locale, this.defaultLocale, this.includeDefaultLocaleRoute) ? `localized-${baseName}-${locale}` : baseName
  }

  private buildRoutePath(
    localeCodes: string[],
    originalPath: string,
    customPath: string,
    isCustom: boolean,
  ): string {
    if (isCustom) {
      return (this.includeDefaultLocaleRoute || !localeCodes.includes(this.defaultLocale.code))
        ? buildFullPath(localeCodes, customPath)
        : normalizePath(customPath)
    }
    return buildFullPath(localeCodes, originalPath)
  }
}
