import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { FileText, FileImage, File, Download, Trash2, Search, Pencil, X, Check } from 'lucide-react';
import Button from '../ui/Button';

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
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif'].includes(ext || '')) return <FileImage className="h-5 w-5 text-primary-500" />;
  if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-400" />;
}

const DocumentsTable: React.FC<DocumentsTableProps> = ({ documents, onView, onDownload, onDelete, onRename }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const columns = useMemo<ColumnDef<DocumentRow, any>[]>(
    () => [
      {
        accessorKey: 'file_name',
        header: 'File Name',
        cell: info => {
          const row = info.row.original;
          const ext = row.file_name.split('.').pop();
          const base = row.file_name.replace(/\.[^.]+$/, '');
          const isEditing = editingId === row.id;
          return (
            <div className="flex items-center gap-2">
              {getFileIcon(row.file_name)}
              {isEditing ? (
                <>
                  <input
                    className="input w-32"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, ''))}
                    autoFocus
                  />
                  <span className="text-xs text-gray-500">.{ext}</span>
                  <button
                    className="ml-1 text-green-600 hover:text-green-800"
                    onClick={() => { onRename?.(row, editingName); setEditingId(null); }}
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => setEditingId(null)}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="truncate max-w-xs" title={row.file_name}>{row.file_name}</span>
                  <button
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => { setEditingId(row.id); setEditingName(base); }}
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
        accessorKey: 'uploaded_at',
        header: 'Uploaded',
        cell: info => new Date(info.getValue()).toLocaleString(),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => onView?.(row.original)} title="View">
              <FileText className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDownload?.(row.original)} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="danger" onClick={() => onDelete?.(row.original)} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onView, onDownload, onDelete, onRename]
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

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="input pl-10 w-full"
            placeholder="Search documents..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-sm text-gray-600">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button size="sm" variant="secondary" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button size="sm" variant="secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 select-none cursor-pointer"
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && <span> ▲</span>}
                    {header.column.getIsSorted() === 'desc' && <span> ▼</span>}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-400">
                  No documents found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {table.getRowModel().rows.length} of {documents.length} documents
        </div>
        <div>
          <label className="mr-2 text-sm text-gray-600">Rows per page:</label>
          <select
            className="input w-20"
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
          >
            {[5, 10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DocumentsTable; 