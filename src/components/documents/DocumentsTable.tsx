import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import {
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Search,
  Pencil,
  X,
  Check,
  MoreVertical,
} from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import DocumentViewer from "./DocumentViewer";

export interface DocumentRow {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

interface DocumentsTableProps {
  documents: DocumentRow[];
  onView?: (doc: DocumentRow) => void;
  onDownload?: (doc: DocumentRow) => void;
  onDelete?: (doc: DocumentRow) => void;
  onRename?: (doc: DocumentRow, newName: string) => void;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "tiff", "tif"].includes(ext || ""))
    return <FileImage className="h-5 w-5 text-primary-500" />;
  if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-400" />;
}

const DocumentsTable: React.FC<DocumentsTableProps> = ({
  documents,
  onView,
  onDownload,
  onDelete,
  onRename,
}) => {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentRow | null>(
    null,
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleStartEdit = (row: DocumentRow) => {
    console.log("Starting edit for:", row.id, row.file_name);
    const base = row.file_name.replace(/\.[^.]+$/, "");
    setEditingId(row.id);
    setEditingName(base);
    setActiveDropdown(null);
  };

  const handleSaveEdit = async (row: DocumentRow) => {
    console.log("Saving edit for:", row.id, "New name:", editingName);
    if (editingName.trim() && onRename) {
      try {
        await onRename(row, editingName.trim());
        setEditingId(null);
        setEditingName("");
      } catch (error) {
        console.error("Error renaming file:", error);
        // Keep editing mode active on error
      }
    }
  };

  const handleCancelEdit = () => {
    console.log("Canceling edit");
    setEditingId(null);
    setEditingName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent, row: DocumentRow) => {
    if (e.key === "Enter") {
      handleSaveEdit(row);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  // Mobile card view for small screens
  const MobileDocumentCard = ({ document }: { document: DocumentRow }) => {
    const isEditing = editingId === document.id;
    const ext = document.file_name.split(".").pop();
    const showDropdown = activeDropdown === document.id;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(document.file_name)}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    className="input text-sm w-full max-w-[150px]"
                    value={editingName}
                    onChange={(e) =>
                      setEditingName(
                        e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, ""),
                      )
                    }
                    onKeyDown={(e) => handleKeyPress(e, document)}
                    autoFocus
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">.{ext}</span>
                  <button
                    className="text-green-600 hover:text-green-800 p-1"
                    onClick={() => handleSaveEdit(document)}
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    className="text-gray-400 hover:text-gray-600 p-1"
                    onClick={handleCancelEdit}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate text-sm">
                    {document.file_name}
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                    onClick={() => handleStartEdit(document)}
                    title="Edit file name"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">
                {formatDate(document.uploaded_at)}
              </p>
            </div>
          </div>
          
          <div className="relative flex-shrink-0">
            <button
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full"
              onClick={() => setActiveDropdown(showDropdown ? null : document.id)}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    setSelectedDocument(document);
                    setActiveDropdown(null);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  View
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    onDownload?.(document);
                    setActiveDropdown(null);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                  onClick={() => {
                    onDelete?.(document);
                    setActiveDropdown(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columns = useMemo<ColumnDef<DocumentRow, any>[]>(
    () => [
      {
        accessorKey: "file_name",
        header: "File Name",
        cell: (info) => {
          const row = info.row.original;
          const ext = row.file_name.split(".").pop();
          const isEditing = editingId === row.id;

          return (
            <div className="flex items-center gap-2">
              {getFileIcon(row.file_name)}
              {isEditing ? (
                <>
                  <input
                    className="input w-32"
                    value={editingName}
                    onChange={(e) =>
                      setEditingName(
                        e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, ""),
                      )
                    }
                    onKeyDown={(e) => handleKeyPress(e, row)}
                    autoFocus
                  />
                  <span className="text-xs text-gray-500">.{ext}</span>
                  <button
                    className="ml-1 text-green-600 hover:text-green-800"
                    onClick={() => handleSaveEdit(row)}
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={handleCancelEdit}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="truncate max-w-xs" title={row.file_name}>
                    {row.file_name}
                  </span>
                  <button
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => handleStartEdit(row)}
                    title="Edit file name"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "uploaded_at",
        header: "Uploaded",
        cell: (info) => new Date(info.getValue()).toLocaleString(),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedDocument(row.original)}
              title="View"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDownload?.(row.original)}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete?.(row.original)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onView, onDownload, onDelete, onRename, editingId, editingName],
  );

  const table = useReactTable({
    data: documents,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  return (
    <div className="w-full">
      <Modal
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
      >
        {selectedDocument && <DocumentViewer document={selectedDocument} />}
      </Modal>
      
      {/* Search and Controls */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="input pl-10 w-full"
            placeholder="Search documents..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        
        {/* Mobile Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm text-gray-600">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Card View (visible on small screens) */}
      <div className="block md:hidden">
        {table.getRowModel().rows.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-lg border">
            No documents found.
          </div>
        ) : (
          <div>
            {table.getRowModel().rows.map((row) => (
              <MobileDocumentCard key={row.id} document={row.original} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View (hidden on small screens) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 select-none cursor-pointer"
                    onClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getIsSorted() === "asc" && <span> ▲</span>}
                    {header.column.getIsSorted() === "desc" && <span> ▼</span>}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-8 text-gray-400"
                >
                  No documents found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
        <div className="text-sm text-gray-600">
          Showing {table.getRowModel().rows.length} of {documents.length}{" "}
          documents
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="rows-per-page" className="text-sm text-gray-600 whitespace-nowrap">
            Rows per page:
          </label>
          <select
            id="rows-per-page"
            className="input w-20"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[5, 10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DocumentsTable;