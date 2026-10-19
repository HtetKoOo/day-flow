type DeviceSubscription = {
  endpoint: string;
  unsubscribe: () => Promise<boolean>;
};

/** Database removal must finish before the browser endpoint is discarded. */
export async function disconnectDeviceSubscription(
  subscription: DeviceSubscription,
  removeOwnedEndpoint: (endpoint: string) => Promise<void>,
  isStillSubscribed: () => Promise<boolean>,
) {
  await removeOwnedEndpoint(subscription.endpoint);
  if (!(await subscription.unsubscribe()) && (await isStillSubscribed())) {
    throw new Error("Could not disconnect this browser. Please try again.");
  }
}
