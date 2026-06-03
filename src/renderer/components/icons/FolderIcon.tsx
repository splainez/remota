import type { SVGAttributes } from "react";
import { getFolderIcon } from "@renderer/shared/icon-utils";
import { Icon } from "./Icon";

export interface FolderIconProps extends SVGAttributes<SVGSVGElement> {
	path: string;
	size?: number | string;
}

export function FolderIcon({ path, size, className, ...rest }: FolderIconProps) {
	const name = getFolderIcon(path);
	return <Icon {...rest} name={name} size={size} className={className} />;
}
