'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface SelectionTableItem {
  id: string
  name: string
  description?: string | null
  images?: { url: string; height: number | null; width: number | null }[]
  trackCount: number
  owner?: string
  isPublic?: boolean | null
  artists?: { name: string }[]
}

interface SelectionTableProps {
  items: SelectionTableItem[]
  selectedItems: Set<string>
  isLoading?: boolean
  type: 'playlists' | 'albums'
  onToggleSelection: (itemId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onLoadTracks?: () => void
  trackLoading?: boolean
  onMakePrivate?: () => void
  onMakePublic?: () => void
  onDeleteItems?: () => void
  privacyLoading?: boolean
}

type SortField = 'name' | 'trackCount' | 'owner' | 'isPublic' | 'artists'
type SortDirection = 'asc' | 'desc'

export function SelectionTable({
  items,
  selectedItems,
  isLoading = false,
  type,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onLoadTracks,
  trackLoading = false,
  onMakePrivate,
  onMakePublic,
  onDeleteItems,
  privacyLoading = false
}: SelectionTableProps) {
  const isPlaylistType = type === 'playlists'
  const allSelected = items.length > 0 && selectedItems.size === items.length
  
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'trackCount':
          aValue = a.trackCount
          bValue = b.trackCount
          break
        case 'owner':
          aValue = (a.owner || '').toLowerCase()
          bValue = (b.owner || '').toLowerCase()
          break
        case 'isPublic':
          aValue = a.isPublic ? 1 : 0
          bValue = b.isPublic ? 1 : 0
          break
        case 'artists':
          aValue = (a.artists?.[0]?.name || '').toLowerCase()
          bValue = (b.artists?.[0]?.name || '').toLowerCase()
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return sorted
  }, [items, sortField, sortDirection])
  
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="inline w-4 h-4 ml-1" /> : 
      <ChevronDown className="inline w-4 h-4 ml-1" />
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-gray-500 text-lg font-semibold mb-2">
          No {type} Found
        </div>
        <p className="text-gray-600">
          {isPlaylistType 
            ? "It looks like you don't have any playlists in your Spotify account yet."
            : "Load tracks from playlists first to see available albums."
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm text-gray-600">
              Select All ({selectedItems.size} of {items.length} selected)
            </span>
          </div>
          
          {selectedItems.size > 0 && (
            <div className="flex space-x-2">
              <Button onClick={onClearSelection} variant="outline">
                Clear Selection
              </Button>
              {isPlaylistType && onMakePrivate && onMakePublic && (
                <>
                  <Button 
                    onClick={onMakePrivate} 
                    disabled={privacyLoading}
                    variant="outline"
                  >
                    {privacyLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    ) : null}
                    Make Private
                  </Button>
                  <Button 
                    onClick={onMakePublic} 
                    disabled={privacyLoading}
                    variant="outline"
                  >
                    {privacyLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    ) : null}
                    Make Public
                  </Button>
                </>
              )}
              {onDeleteItems && (
                <Button 
                  onClick={onDeleteItems} 
                  disabled={privacyLoading}
                  variant="destructive"
                >
                  {privacyLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  {isPlaylistType ? 'Delete Selected' : 'Remove from Library'}
                </Button>
              )}
              {onLoadTracks && (
                <Button onClick={onLoadTracks} disabled={trackLoading}>
                  {trackLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading Tracks...
                    </>
                  ) : (
                    isPlaylistType 
                      ? `Load Tracks (${selectedItems.size} ${type})`
                      : `Add to Queue (${selectedItems.size} ${type})`
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Selection Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded space-y-2">
          {selectedItems.size > 0 ? (() => {
            const selectedItemsList = items.filter(item => selectedItems.has(item.id))
            const totalTracks = selectedItemsList.reduce((sum, item) => sum + item.trackCount, 0)
            
            return (
              <div className="space-y-2">
                <div className="font-medium text-blue-700">
                  Selected {selectedItems.size} {type} will load ~{totalTracks} tracks
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 text-xs">
                  {selectedItemsList.map((item) => (
                    <div key={item.id} className="text-gray-600 truncate">
                      <span className="font-medium">{item.name}</span> ({item.trackCount})
                    </div>
                  ))}
                </div>
              </div>
            )
          })() : (
            <span>Select {type} above to see track count and summary here</span>
          )}
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Select</TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon field="name" />
              </TableHead>
              <TableHead 
                className="w-20 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('trackCount')}
              >
                Tracks <SortIcon field="trackCount" />
              </TableHead>
              {isPlaylistType ? (
                <>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('owner')}
                  >
                    Owner <SortIcon field="owner" />
                  </TableHead>
                  <TableHead 
                    className="w-24 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('isPublic')}
                  >
                    Public <SortIcon field="isPublic" />
                  </TableHead>
                </>
              ) : (
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('artists')}
                >
                  Artist <SortIcon field="artists" />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => onToggleSelection(item.id)}
                  />
                </TableCell>
                <TableCell>
                  {item.images && item.images.length > 0 && item.images[0] && (
                    <Image
                      src={item.images[0].url}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="rounded"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{item.trackCount}</TableCell>
                {isPlaylistType ? (
                  <>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.isPublic 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.isPublic ? 'Public' : 'Private'}
                      </span>
                    </TableCell>
                  </>
                ) : (
                  <TableCell>
                    {item.artists?.map(artist => artist.name).join(', ')}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}