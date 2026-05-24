import type { SVGAttributes } from "react";
import { getFileIcon } from "../../shared/icon-utils";
import { Icon } from "./Icon";

export interface FileIconProps extends SVGAttributes<SVGSVGElement> {
	path: string;
	size?: number | string;
}

export function FileIcon({ path, size, className, ...rest }: FileIconProps) {
	const name = getFileIcon(path);
	return <Icon {...rest} name={name} size={size} className={className} />;
}
