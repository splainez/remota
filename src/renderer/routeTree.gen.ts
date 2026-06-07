import { rootRoute } from "./routes/__root";
import { browseRoute } from "./routes/browse.$connectionId";
import { connectionDetailRoute } from "./routes/connections.$id";
import { connectionEditRoute } from "./routes/connections.$id.edit";
import { connectionNewRoute } from "./routes/connections.new";
import { indexRoute } from "./routes/index";
import { settingsRoute } from "./routes/settings";

export const routeTree = rootRoute.addChildren([
	indexRoute,
	connectionDetailRoute,
	connectionNewRoute,
	connectionEditRoute,
	browseRoute,
	settingsRoute,
]);
