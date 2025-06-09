import React, { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { v4 as uuidv4 } from "uuid";

const parts = ["Soprano", "Alto", "Tenor", "Bass"] as const;
type Part = (typeof parts)[number];
interface Member {
    id: string;
    name: string;
    part: Part;
}

const partColors: Record<Part, string> = {
    Soprano: "#ffe0e6",
    Alto: "#e0ffe3",
    Tenor: "#e0f0ff",
    Bass: "#fff5cc",
};

const ItemType = "MEMBER";

const Row: React.FC<{
    rowIndex: number;
    members: (Member | null)[];
    moveMember: (fromRow: number, fromIndex: number, toRow: number, toIndex: number) => void;
    maxCount: number;
}> = ({ rowIndex, members, moveMember, maxCount }) => {
    const memberWidth = 110;
    const totalRowWidth = maxCount * memberWidth;
    const currentRowWidth = members.length * memberWidth;
    const indent = (rowIndex % 2) * (memberWidth / 2);
    const leftMargin = Math.max((totalRowWidth - currentRowWidth) / 2 + indent, 0);

    return (
        <div
            style={{
                display: "flex",
                marginLeft: leftMargin,
                marginBottom: 20,
                minHeight: 60,
            }}
        >
            {members.slice(0, maxCount).map((member, index) => (
                <DraggableMember key={index} member={member} index={index} row={rowIndex} moveMember={moveMember} />
            ))}
        </div>
    );
};

const DraggableMember: React.FC<{
    member: Member | null;
    index: number;
    row: number;
    moveMember: (fromRow: number, fromIndex: number, toRow: number, toIndex: number) => void;
}> = ({ member, index, row, moveMember }) => {
    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: ItemType,
        item: { index, row },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }));

    const [, dropRef] = useDrop(() => ({
        accept: ItemType,
        drop: (item: { index: number; row: number }) => {
            if (item.row !== row || item.index !== index) {
                moveMember(item.row, item.index, row, index);
            }
        },
    }));

    return (
        <div
            ref={(node) => {
                if (node) dragRef(dropRef(node));
            }}
            style={{
                padding: 10,
                width: 100,
                height: 50,
                marginRight: 10,
                backgroundColor: member ? partColors[member.part] : "#f0f0f0",
                border: "1px dashed #ccc",
                opacity: isDragging ? 0.5 : 1,
                textAlign: "center",
                cursor: "move",
            }}
        >
            {member ? (
                <>
                    <strong>{member.name}</strong>
                    <div style={{ fontSize: 12 }}>{member.part}</div>
                </>
            ) : (
                <div style={{ color: "#ccc", fontSize: 12 }}>빈자리</div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [layoutMode, setLayoutMode] = useState<"auto" | "condition1" | "condition2">("auto");
    const [counts, setCounts] = useState<Record<Part, string>>({
        Soprano: "9",
        Alto: "10",
        Tenor: "5",
        Bass: "5",
    });

    const [rowCount, setRowCount] = useState(3);
    const [rows, setRows] = useState<(Member | null)[][]>([]);

    const generateMembers = () => {
        const soprano = Array.from({ length: parseInt(counts.Soprano) || 0 }, (_, i) => ({
            id: uuidv4(),
            name: `S${i}`,
            part: "Soprano" as Part,
        }));
        const alto = Array.from({ length: parseInt(counts.Alto) || 0 }, (_, i) => ({
            id: uuidv4(),
            name: `A${i}`,
            part: "Alto" as Part,
        }));
        const tenor = Array.from({ length: parseInt(counts.Tenor) || 0 }, (_, i) => ({
            id: uuidv4(),
            name: `T${i}`,
            part: "Tenor" as Part,
        }));
        const bass = Array.from({ length: parseInt(counts.Bass) || 0 }, (_, i) => ({
            id: uuidv4(),
            name: `B${i}`,
            part: "Bass" as Part,
        }));

        const newRows: (Member | null)[][] = Array.from({ length: rowCount }, () => []);

        const flatInsert = (members: Member[], targetRows: number[]) => {
            let i = 0;
            for (const m of members) {
                const row = targetRows[i % targetRows.length];
                newRows[row].push(m);
                i++;
            }
        };

        if (layoutMode === "condition1") {
            flatInsert([...soprano, ...alto], [0, 1]);
            flatInsert([...tenor, ...bass], [2]);
        } else if (layoutMode === "condition2") {
            flatInsert([...soprano, ...alto], [0, 1, 2]);
            flatInsert([...tenor, ...bass], [3]);
        } else {
            flatInsert(
                [...soprano, ...alto, ...tenor, ...bass],
                Array.from({ length: rowCount }, (_, i) => i)
            );
        }

        const maxLength = Math.max(...newRows.map((r) => r.length));
        const balancedRows = newRows.map((row, idx) => {
            const trimmed = row.slice(0, maxLength);
            const diff = maxLength - trimmed.length;
            const padLeft = Math.floor(diff / 2);
            const padRight = diff - padLeft;
            return [
                ...Array.from({ length: padLeft }, () => null),
                ...trimmed,
                ...Array.from({ length: padRight }, () => null),
            ];
        });

        setRows(balancedRows);
    };

    const moveMember = (fromRow: number, fromIndex: number, toRow: number, toIndex: number) => {
        setRows((prev) => {
            const newRows = prev.map((row) => [...row]);
            const fromMember = newRows[fromRow][fromIndex];
            const toMember = newRows[toRow][toIndex];
            newRows[fromRow][fromIndex] = toMember;
            newRows[toRow][toIndex] = fromMember;
            return newRows;
        });
    };

    const maxRowLength = Math.max(...rows.map((r) => r.length), 1);

    return (
        <DndProvider backend={HTML5Backend}>
            <div style={{ padding: 30 }}>
                <h1>🎶 합창단 무대 배치</h1>

                {parts.map((part) => (
                    <div key={part}>
                        <label>{part}</label>
                        <input
                            type="number"
                            min="0"
                            value={counts[part]}
                            onChange={(e) => setCounts((prev) => ({ ...prev, [part]: e.target.value }))}
                        />
                    </div>
                ))}

                <div>
                    <label>전체 인원 수</label>
                    <input
                        type="number"
                        min="0"
                        value={Object.values(counts).reduce((sum, val) => sum + (parseInt(val) || 0), 0)}
                        readOnly
                    />
                </div>

                <div>
                    <label>줄 수</label>
                    <input
                        type="number"
                        min="1"
                        value={rowCount}
                        onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                </div>

                <div>
                    <label>배치 조건</label>
                    <select value={layoutMode} onChange={(e) => setLayoutMode(e.target.value as any)}>
                        <option value="auto">자동</option>
                        <option value="condition1">조건1 (1,2=S/A, 3=T/B)</option>
                        <option value="condition2">조건2 (1~3=S/A, 4=T/B)</option>
                    </select>
                </div>

                <button onClick={generateMembers}>전체 재배치</button>
            </div>

            {rows.map((row, i) => (
                <Row key={i} rowIndex={i} members={row} moveMember={moveMember} maxCount={maxRowLength} />
            ))}
        </DndProvider>
    );
};

export default App;
