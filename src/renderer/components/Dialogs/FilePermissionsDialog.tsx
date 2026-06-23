import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { Checkbox } from "@renderer/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@renderer/components/ui/dialog";
import { Input } from "@renderer/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@renderer/components/ui/select";
import type { UnixGroup, UnixUser } from "@renderer/hooks/useFilePermissions";
import { useI18n } from "@renderer/hooks/useI18n";
import type { FileEntry } from "@shared/types";
import { useCallback, useEffect, useMemo, useState } from "react";

interface FilePermissionsDialogProps {
	open: boolean;
	entry: FileEntry | null;
	users: UnixUser[];
	groups: UnixGroup[];
	loading: boolean;
	onClose: () => void;
	onApply: (data: { mode: string; uid: number; gid: number }) => Promise<void>;
}

interface PermissionBits {
	ownerR: boolean;
	ownerW: boolean;
	ownerX: boolean;
	ownerSetUid: boolean;
	groupR: boolean;
	groupW: boolean;
	groupX: boolean;
	groupSetGid: boolean;
	othersR: boolean;
	othersW: boolean;
	othersX: boolean;
	othersSticky: boolean;
}

function modeToBits(mode: number): PermissionBits {
	const m = mode & 0o7777;
	return {
		ownerR: (m & 0o400) !== 0,
		ownerW: (m & 0o200) !== 0,
		ownerX: (m & 0o100) !== 0,
		ownerSetUid: (m & 0o4000) !== 0,
		groupR: (m & 0o040) !== 0,
		groupW: (m & 0o020) !== 0,
		groupX: (m & 0o010) !== 0,
		groupSetGid: (m & 0o2000) !== 0,
		othersR: (m & 0o004) !== 0,
		othersW: (m & 0o002) !== 0,
		othersX: (m & 0o001) !== 0,
		othersSticky: (m & 0o1000) !== 0,
	};
}

function bitsToMode(bits: PermissionBits): number {
	let m = 0;
	if (bits.ownerR) m |= 0o400;
	if (bits.ownerW) m |= 0o200;
	if (bits.ownerX) m |= 0o100;
	if (bits.ownerSetUid) m |= 0o4000;
	if (bits.groupR) m |= 0o040;
	if (bits.groupW) m |= 0o020;
	if (bits.groupX) m |= 0o010;
	if (bits.groupSetGid) m |= 0o2000;
	if (bits.othersR) m |= 0o004;
	if (bits.othersW) m |= 0o002;
	if (bits.othersX) m |= 0o001;
	if (bits.othersSticky) m |= 0o1000;
	return m;
}

function modeToOctal(mode: number): string {
	return (mode & 0o7777).toString(8).padStart(4, "0");
}

function octalToMode(octal: string): number {
	return Number.parseInt(octal, 8) || 0;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${String(bytes)} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function FilePermissionsDialog({
	open,
	entry,
	users,
	groups,
	loading,
	onClose,
	onApply,
}: FilePermissionsDialogProps) {
	const { t } = useI18n();
	const [bits, setBits] = useState<PermissionBits>(() => modeToBits(entry?.mode ?? 0o644));
	const [octalInput, setOctalInput] = useState(() => modeToOctal(entry?.mode ?? 0o644));
	const [selectedUid, setSelectedUid] = useState<number>(entry?.uid ?? 0);
	const [selectedGid, setSelectedGid] = useState<number>(entry?.gid ?? 0);
	const [applying, setApplying] = useState(false);

	const octal = useMemo(() => modeToOctal(bitsToMode(bits)), [bits]);

	useEffect(() => {
		if (entry) {
			setBits(modeToBits(entry.mode ?? 0o644));
			setOctalInput(modeToOctal(entry.mode ?? 0o644));
			setSelectedUid(entry.uid ?? 0);
			setSelectedGid(entry.gid ?? 0);
		}
	}, [entry]);

	const updateBits = useCallback((update: Partial<PermissionBits>) => {
		setBits((prev) => ({ ...prev, ...update }));
	}, []);

	const handleOctalChange = useCallback((value: string) => {
		setOctalInput(value);
		if (/^[0-7]{3,4}$/.test(value)) {
			setBits(modeToBits(octalToMode(value)));
		}
	}, []);

	const handleApply = useCallback(async () => {
		if (applying) return;
		setApplying(true);
		try {
			await onApply({ mode: octal, uid: selectedUid, gid: selectedGid });
		} finally {
			setApplying(false);
		}
	}, [applying, octal, selectedUid, selectedGid, onApply]);

	const currentUid = useMemo(() => {
		if (!entry) return 0;
		return entry.uid ?? 0;
	}, [entry]);

	const currentGid = useMemo(() => {
		if (!entry) return 0;
		return entry.gid ?? 0;
	}, [entry]);

	if (!entry) return null;

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>{t("file.permissions.title")}</DialogTitle>
				</DialogHeader>

				<div className="flex items-center gap-3 rounded-lg bg-surface-container-high p-3">
					<Icon name={entry.isDirectory ? "folder" : "file"} size={32} className="shrink-0 text-muted-foreground" />
					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-medium">{entry.name}</div>
						<div className="truncate text-xs text-muted-foreground">{entry.fullPath}</div>
						<div className="text-xs text-muted-foreground">{formatSize(entry.size)}</div>
					</div>
				</div>

				<div className="grid gap-3">
					<div className="grid items-center gap-1.5" style={{ gridTemplateColumns: "80px 1fr" }}>
						<span className="text-sm">{t("file.permissions.owner")}</span>
						{loading ? (
							<div className="h-8 animate-pulse rounded-lg bg-surface-container-high" />
						) : (
							<Select
								value={String(selectedUid)}
								onValueChange={(value) => {
									setSelectedUid(Number(value));
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{users.map((user) => (
										<SelectItem key={user.uid} value={String(user.uid)}>
											{user.name} ({String(user.uid)})
										</SelectItem>
									))}
									{!users.some((u) => u.uid === currentUid) && currentUid > 0 && (
										<SelectItem value={String(currentUid)}>{String(currentUid)}</SelectItem>
									)}
								</SelectContent>
							</Select>
						)}
					</div>

					<div className="grid items-center gap-1.5" style={{ gridTemplateColumns: "80px 1fr" }}>
						<span className="text-sm">{t("file.permissions.group")}</span>
						{loading ? (
							<div className="h-8 animate-pulse rounded-lg bg-surface-container-high" />
						) : (
							<Select
								value={String(selectedGid)}
								onValueChange={(value) => {
									setSelectedGid(Number(value));
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{groups.map((group) => (
										<SelectItem key={group.gid} value={String(group.gid)}>
											{group.name} ({String(group.gid)})
										</SelectItem>
									))}
									{!groups.some((g) => g.gid === currentGid) && currentGid > 0 && (
										<SelectItem value={String(currentGid)}>{String(currentGid)}</SelectItem>
									)}
								</SelectContent>
							</Select>
						)}
					</div>

					<div className="mt-1">
						<div className="mb-2 text-sm">{t("file.permissions.permissions")}</div>
						<div className="grid gap-1.5 text-sm" style={{ gridTemplateColumns: "70px repeat(4, auto)" }}>
							<div className="text-muted-foreground">{t("file.permissions.owner")}</div>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.ownerR}
									onCheckedChange={(v) => {
										updateBits({ ownerR: v });
									}}
								/>
								<span>R</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.ownerW}
									onCheckedChange={(v) => {
										updateBits({ ownerW: v });
									}}
								/>
								<span>W</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.ownerX}
									onCheckedChange={(v) => {
										updateBits({ ownerX: v });
									}}
								/>
								<span>X</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.ownerSetUid}
									onCheckedChange={(v) => {
										updateBits({ ownerSetUid: v });
									}}
								/>
								<span>{t("file.permissions.ownerSetUid")}</span>
							</label>

							<div className="text-muted-foreground">{t("file.permissions.group")}</div>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.groupR}
									onCheckedChange={(v) => {
										updateBits({ groupR: v });
									}}
								/>
								<span>R</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.groupW}
									onCheckedChange={(v) => {
										updateBits({ groupW: v });
									}}
								/>
								<span>W</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.groupX}
									onCheckedChange={(v) => {
										updateBits({ groupX: v });
									}}
								/>
								<span>X</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.groupSetGid}
									onCheckedChange={(v) => {
										updateBits({ groupSetGid: v });
									}}
								/>
								<span>{t("file.permissions.groupSetGid")}</span>
							</label>

							<div className="text-muted-foreground">{t("file.permissions.others")}</div>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.othersR}
									onCheckedChange={(v) => {
										updateBits({ othersR: v });
									}}
								/>
								<span>R</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.othersW}
									onCheckedChange={(v) => {
										updateBits({ othersW: v });
									}}
								/>
								<span>W</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.othersX}
									onCheckedChange={(v) => {
										updateBits({ othersX: v });
									}}
								/>
								<span>X</span>
							</label>
							<label className="flex items-center gap-1">
								<Checkbox
									checked={bits.othersSticky}
									onCheckedChange={(v) => {
										updateBits({ othersSticky: v });
									}}
								/>
								<span>{t("file.permissions.othersSticky")}</span>
							</label>
						</div>
					</div>

					<div className="grid items-center gap-1.5" style={{ gridTemplateColumns: "80px 80px" }}>
						<span className="text-sm">{t("file.permissions.octal")}</span>
						<Input
							value={octalInput}
							onChange={(e) => {
								handleOctalChange(e.target.value);
							}}
							maxLength={4}
							className="h-8 w-20 font-mono"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" size="sm" onClick={onClose}>
						{t("file.permissions.cancel")}
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => {
							void handleApply();
						}}
						disabled={applying}
					>
						{t("file.permissions.apply")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
