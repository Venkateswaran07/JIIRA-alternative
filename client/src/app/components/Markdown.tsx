import React from "react";
import { cx } from "../../utils/ui";

type MarkdownProps = {
  content: string;
  className?: string;
};

type ListItem = {
  content: string;
  checked?: boolean;
};

const tableDivider = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const unorderedItem = /^\s*[-+*•]\s+(.+)$/;
const orderedItem = /^\s*(\d+)[.)]\s+(.+)$/;

function normalizeEscapedMarkdown(content: string) {
  // Some providers return Markdown as an escaped JSON string, leaving the
  // fence and newline markers visible in the chat instead of rendering them.
  if (!content.includes("\\n") || (!content.includes("```") && !content.includes('\\"'))) return content;
  return content.replace(/\\r?\\n/g, "\n").replace(/\\"/g, '"');
}

function formatJsonCode(code: string, language?: string) {
  if (language?.toLowerCase() !== "json") return code;
  try {
    return JSON.stringify(JSON.parse(code.trim()), null, 2);
  } catch {
    return code;
  }
}

function splitTableRow(row: string) {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cell = "";

  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (character === "\\" && trimmed[index + 1] === "|") {
      cell += "|";
      index += 1;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function safeLink(href: string) {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href) ? href : undefined;
}

function inlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const token = /(<br\s*\/?>|`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_))/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = token.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${match.index}`;

    if (/^<br/i.test(match[0])) {
      nodes.push(<br key={key} />);
    } else if (match[2] !== undefined) {
      nodes.push(<code key={key}>{match[2]}</code>);
    } else if (match[3] !== undefined) {
      const href = safeLink(match[4]);
      nodes.push(href ? (
        <a href={href} key={key} rel={href.startsWith("http") ? "noreferrer" : undefined} target={href.startsWith("http") ? "_blank" : undefined}>
          {match[3]}
        </a>
      ) : match[3]);
    } else if (match[5] !== undefined || match[6] !== undefined) {
      nodes.push(<strong key={key}>{inlineMarkdown(match[5] ?? match[6], `${key}-strong`)}</strong>);
    } else if (match[7] !== undefined) {
      nodes.push(<del key={key}>{inlineMarkdown(match[7], `${key}-del`)}</del>);
    } else {
      nodes.push(<em key={key}>{inlineMarkdown(match[8] ?? match[9], `${key}-em`)}</em>);
    }
    lastIndex = token.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : [text];
}

function CustomMarkdownView({ content, className }: MarkdownProps) {
  const lines = normalizeEscapedMarkdown(content).replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```([\w-]+)?\s*$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const formattedCode = formatJsonCode(code.join("\n"), fence[1]);
      blocks.push(
        <pre className="md-code-block" key={`code-${index}`}>
          {fence[1] && <span className="md-code-language">{fence[1]}</span>}
          <code>{formattedCode}</code>
        </pre>,
      );
      continue;
    }

    if (index + 1 < lines.length && trimmed.includes("|") && tableDivider.test(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div className="md-table-scroll" key={`table-${index}`}>
          <table>
            <thead><tr>{headers.map((header, cellIndex) => <th key={cellIndex}>{inlineMarkdown(header, `th-${index}-${cellIndex}`)}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}>{inlineMarkdown(row[cellIndex] ?? "", `td-${index}-${rowIndex}-${cellIndex}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(React.createElement(`h${level}`, { key: `heading-${index}` }, inlineMarkdown(heading[2], `heading-${index}`)));
      index += 1;
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${index}`} />);
      index += 1;
      continue;
    }

    const firstUnordered = trimmed.match(unorderedItem);
    const firstOrdered = trimmed.match(orderedItem);
    if (firstUnordered || firstOrdered) {
      const ordered = Boolean(firstOrdered);
      const items: ListItem[] = [];
      const start = firstOrdered ? Number(firstOrdered[1]) : undefined;
      while (index < lines.length) {
        const match = lines[index].trim().match(ordered ? orderedItem : unorderedItem);
        if (!match) break;
        const rawContent = match[ordered ? 2 : 1];
        const task = rawContent.match(/^\[([ xX])\]\s+(.+)$/);
        items.push({ content: task ? task[2] : rawContent, checked: task ? task[1].toLowerCase() === "x" : undefined });
        index += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag className={items.some((item) => item.checked !== undefined) ? "md-task-list" : undefined} key={`list-${index}`} start={start}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {item.checked !== undefined && <input aria-label={item.checked ? "Completed" : "Not completed"} checked={item.checked} disabled type="checkbox" />}
              <span>{inlineMarkdown(item.content, `li-${index}-${itemIndex}`)}</span>
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}>{inlineMarkdown(quote.join(" "), `quote-${index}`)}</blockquote>);
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+/.test(lines[index].trim()) && !unorderedItem.test(lines[index].trim()) && !orderedItem.test(lines[index].trim()) && !/^```/.test(lines[index].trim()) && !(index + 1 < lines.length && lines[index].includes("|") && tableDivider.test(lines[index + 1]))) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{inlineMarkdown(paragraph.join(" "), `p-${index}`)}</p>);
  }

  return <div className={cx("custom-markdown", className)}>{blocks}</div>;
}

export const CustomMarkdown = React.memo(CustomMarkdownView);
