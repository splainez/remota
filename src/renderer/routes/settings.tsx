/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { SettingsView } from "@renderer/components/Settings/SettingsView";
import { createRoute, useNavigate } from "@tanstack/react-router";

import { rootRoute } from "./__root";

export const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/settings",
	component: SettingsRoute,
});

function SettingsRoute() {
	const navigate = useNavigate();

	return (
		<SettingsView
			onBack={() => {
				void navigate({ to: "/" });
			}}
		/>
	);
}
