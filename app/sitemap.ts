import { getCollections, getPages, getProducts } from "lib/mongodb";
import { baseUrl, validateEnvironmentVariables } from "lib/utils";
import { MetadataRoute } from "next";

type Route = {
  url: string;
  lastModified: string;
};

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  validateEnvironmentVariables();

  const routesMap = [""].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
  }));

  const collectionsPromise = getCollections().then((collections) =>
    collections.map((collection) => ({
      url: `${baseUrl}${collection.path}`,
      lastModified: collection.updatedAt,
    })),
  );

  const productsPromise = getProducts({}).then((products) =>
    products.map((product) => ({
      url: `${baseUrl}/product/${product.handle}`,
      lastModified: product.updatedAt || new Date().toISOString(),
    })),
  ).catch(err => {
    console.error("Sitemap Products Fetch Error:", err);
    return [];
  });

  const pagesPromise = getPages().then((pages) =>
    pages.map((page) => ({
      url: `${baseUrl}/${page.handle}`,
      lastModified: page.updatedAt,
    })),
  );

  let fetchedRoutes: Route[] = [];

  try {
    const results = await Promise.allSettled([collectionsPromise, productsPromise, pagesPromise]);
    fetchedRoutes = results
      .filter((r): r is PromiseFulfilledResult<Route[]> => r.status === 'fulfilled')
      .map(r => r.value)
      .flat();
  } catch (error) {
    console.error("Critical Sitemap Error:", error);
  }

  return [...routesMap, ...fetchedRoutes];
}
