import { MailtrapClient } from "mailtrap";

import { mailtrapConfig } from "@config";

const mailtrapClient = new MailtrapClient({
  token: mailtrapConfig.token,
});

export { mailtrapClient };