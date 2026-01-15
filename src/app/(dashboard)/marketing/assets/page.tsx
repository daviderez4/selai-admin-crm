'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Image as ImageIcon,
  Video,
  MoreVertical,
  Trash2,
  Download,
  Copy,
  Eye,
  Upload,
  Grid,
  List,
  X,
  Check,
  Sparkles,
  Loader2,
  Palette,
  Car,
  Home,
  Heart,
  Activity,
  Briefcase,
  PiggyBank,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useMarketingStore, type MarketingAsset } from '@/stores/marketingStore'
import { MARKETING_IMAGES, getImagesByCategory, type MarketingImage } from '@/lib/marketing-images'
import { toast } from 'sonner'

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const categoryIcons: Record<string, React.ReactNode> = {
  car: <Car className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  life: <Heart className="h-4 w-4" />,
  health: <Activity className="h-4 w-4" />,
  business: <Briefcase className="h-4 w-4" />,
  pension: <PiggyBank className="h-4 w-4" />,
  general: <Sparkles className="h-4 w-4" />,
}

const categoryLabels: Record<string, string> = {
  car: 'ביטוח רכב',
  home: 'ביטוח דירה',
  life: 'ביטוח חיים',
  health: 'ביטוח בריאות',
  business: 'ביטוח עסקי',
  pension: 'פנסיה וחיסכון',
  general: 'כללי',
}

export default function AssetsPage() {
  const { assets, setAssets, addAsset, deleteAsset } = useMarketingStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'generated'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<MarketingAsset | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isGeneratedLibraryOpen, setIsGeneratedLibraryOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize with stock photos converted to assets
  useEffect(() => {
    if (assets.length === 0) {
      const stockPhotoAssets: MarketingAsset[] = MARKETING_IMAGES.slice(0, 6).map(img => ({
        id: img.id,
        name: img.name_he,
        type: 'image',
        url: img.url,
        thumbnail_url: img.thumbnail,
        size_bytes: 250000, // ~250KB average for stock photos
        dimensions: { width: 1920, height: 1080 },
        tags: [img.category, 'stock-photo'],
        created_at: new Date().toISOString(),
      }))
      setAssets(stockPhotoAssets)
    }
  }, [assets.length, setAssets])

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'generated' ? asset.tags?.includes('stock-photo') : asset.type === typeFilter)
    return matchesSearch && matchesType
  })

  const filteredStockImages = selectedCategory === 'all'
    ? MARKETING_IMAGES
    : MARKETING_IMAGES.filter(img => img.category === selectedCategory)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    setIsUploading(true)

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`סוג קובץ לא נתמך: ${file.name}`)
        continue
      }

      // Create preview URL
      const url = URL.createObjectURL(file)

      // Get dimensions for images
      let dimensions = { width: 0, height: 0 }
      let duration_seconds: number | undefined

      if (file.type.startsWith('image/')) {
        const img = new Image()
        img.src = url
        await new Promise(resolve => img.onload = resolve)
        dimensions = { width: img.width, height: img.height }
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.src = url
        await new Promise(resolve => video.onloadedmetadata = resolve)
        dimensions = { width: video.videoWidth, height: video.videoHeight }
        duration_seconds = Math.round(video.duration)
      }

      const newAsset: MarketingAsset = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url,
        thumbnail_url: url,
        size_bytes: file.size,
        dimensions,
        duration_seconds,
        mime_type: file.type,
        tags: [],
        created_at: new Date().toISOString(),
      }

      addAsset(newAsset)
      toast.success(`הקובץ "${file.name}" הועלה בהצלחה`)
    }

    setIsUploading(false)
    setIsUploadOpen(false)
  }

  const handleAddStockImage = (img: MarketingImage) => {
    const newAsset: MarketingAsset = {
      id: `stock-${Date.now()}-${img.id}`,
      name: img.name_he,
      type: 'image',
      url: img.url,
      thumbnail_url: img.thumbnail,
      size_bytes: 250000, // ~250KB average for stock photos
      dimensions: { width: 1920, height: 1080 },
      tags: [img.category, 'stock-photo'],
      created_at: new Date().toISOString(),
    }
    addAsset(newAsset)
    toast.success(`התמונה "${img.name_he}" נוספה לספרייה`)
  }

  const handleDelete = (id: string) => {
    deleteAsset(id)
    toast.success('הקובץ נמחק בהצלחה')
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('הקישור הועתק!')
  }

  const downloadAsset = (asset: MarketingAsset) => {
    const link = document.createElement('a')
    link.href = asset.url
    link.download = asset.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('ההורדה החלה')
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
            <ImageIcon className="h-8 w-8 text-emerald-600" />
            ספריית מדיה
          </h1>
          <p className="text-slate-500">נהל תמונות וסרטונים לקמפיינים</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsGeneratedLibraryOpen(true)}
            className="gap-2 border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <Sparkles className="h-4 w-4" />
            תמונות מקצועיות
          </Button>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25"
          >
            <Upload className="h-4 w-4" />
            העלה קבצים
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8"
      >
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {assets.filter((a) => a.type === 'image').length}
              </p>
              <p className="text-sm text-slate-500">תמונות</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {assets.filter((a) => a.type === 'video').length}
              </p>
              <p className="text-sm text-slate-500">סרטונים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {assets.filter((a) => a.tags?.includes('stock-photo')).length}
              </p>
              <p className="text-sm text-slate-500">תמונות מקצועיות</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {formatFileSize(assets.reduce((sum, a) => sum + (a.size_bytes || 0), 0))}
              </p>
              <p className="text-sm text-slate-500">סה"כ נפח</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="חיפוש קבצים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-white/80 backdrop-blur-sm border-slate-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className={typeFilter === 'all' ? '' : 'bg-white/80'}
          >
            הכל
          </Button>
          <Button
            variant={typeFilter === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('image')}
            className={typeFilter === 'image' ? '' : 'bg-white/80'}
          >
            <ImageIcon className="h-4 w-4 ml-1" />
            תמונות
          </Button>
          <Button
            variant={typeFilter === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('video')}
            className={typeFilter === 'video' ? '' : 'bg-white/80'}
          >
            <Video className="h-4 w-4 ml-1" />
            סרטונים
          </Button>
          <Button
            variant={typeFilter === 'generated' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('generated')}
            className={typeFilter === 'generated' ? '' : 'bg-white/80'}
          >
            <Sparkles className="h-4 w-4 ml-1" />
            מקצועיות
          </Button>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mr-auto">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Assets Grid/List */}
      <div
        className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}
      >
        <AnimatePresence mode="popLayout">
          {filteredAssets.map((asset, index) => (
            <motion.div
              key={asset.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.03 }}
            >
              {viewMode === 'grid' ? (
                <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl bg-white/80 backdrop-blur-sm transition-all duration-300 cursor-pointer">
                  {/* Thumbnail */}
                  <div className="aspect-square relative overflow-hidden bg-slate-100">
                    <img
                      src={asset.thumbnail_url || asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Type Badge */}
                    <Badge
                      className={`absolute top-2 right-2 ${
                        asset.tags?.includes('stock-photo')
                          ? 'bg-purple-500 text-white'
                          : asset.type === 'video'
                          ? 'bg-pink-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {asset.tags?.includes('stock-photo') ? (
                        <Sparkles className="h-3 w-3" />
                      ) : asset.type === 'video' ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <ImageIcon className="h-3 w-3" />
                      )}
                    </Badge>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => copyUrl(asset.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => downloadAsset(asset)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{asset.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(asset.size_bytes || 0)}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm transition-all">
                  <CardContent className="p-3 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      <img
                        src={asset.thumbnail_url || asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{asset.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatFileSize(asset.size_bytes || 0)} • {asset.dimensions?.width}x{asset.dimensions?.height}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {asset.tags?.includes('stock-photo') ? 'מעוצב' : asset.type === 'video' ? 'סרטון' : 'תמונה'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedAsset(asset)}>
                          <Eye className="h-4 w-4 ml-2" />
                          צפייה
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyUrl(asset.url)}>
                          <Copy className="h-4 w-4 ml-2" />
                          העתק קישור
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadAsset(asset)}>
                          <Download className="h-4 w-4 ml-2" />
                          הורדה
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          מחק
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <ImageIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">לא נמצאו קבצים</h3>
          <p className="text-slate-500 mb-4">נסה לשנות את החיפוש או הפילטרים</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setIsGeneratedLibraryOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              תמונות מקצועיות
            </Button>
            <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              העלה קבצים
            </Button>
          </div>
        </motion.div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>העלאת קבצים</DialogTitle>
            <DialogDescription>
              העלה תמונות וסרטונים לספריית המדיה שלך
            </DialogDescription>
          </DialogHeader>
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-600">מעלה קבצים...</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">גרור קבצים לכאן או</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  בחר קבצים
                </Button>
                <p className="text-xs text-slate-400 mt-4">PNG, JPG, GIF, MP4, WebM עד 100MB</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Images Library Dialog */}
      <Dialog open={isGeneratedLibraryOpen} onOpenChange={setIsGeneratedLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              ספריית תמונות מקצועיות
            </DialogTitle>
            <DialogDescription>
              תמונות מקצועיות חינמיות מ-Unsplash לשימוש בקמפיינים שלך
            </DialogDescription>
          </DialogHeader>

          {/* Category Tabs */}
          <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="all" className="gap-1">
                <Palette className="h-4 w-4" />
                הכל
              </TabsTrigger>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="gap-1">
                  {categoryIcons[key]}
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="overflow-y-auto max-h-[50vh] pr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredStockImages.map((img) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative"
                  >
                    <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all cursor-pointer">
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={img.thumbnail}
                          alt={img.name_he}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="sm"
                            onClick={() => handleAddStockImage(img)}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            הוסף לספרייה
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-slate-900 truncate">{img.name_he}</p>
                        <Badge variant="secondary" className="mt-1">
                          {categoryLabels[img.category]}
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratedLibraryOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-slate-100">
                {selectedAsset.type === 'video' ? (
                  <video
                    src={selectedAsset.url}
                    controls
                    className="w-full max-h-[60vh] object-contain"
                  />
                ) : (
                  <img
                    src={selectedAsset.url}
                    alt={selectedAsset.name}
                    className="w-full max-h-[60vh] object-contain"
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  {selectedAsset.dimensions?.width}x{selectedAsset.dimensions?.height} •{' '}
                  {formatFileSize(selectedAsset.size_bytes || 0)}
                  {selectedAsset.tags?.includes('generated') && (
                    <Badge className="mr-2 bg-purple-100 text-purple-700">מעוצב</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(selectedAsset.url)}>
                    <Copy className="h-4 w-4 ml-2" />
                    העתק קישור
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadAsset(selectedAsset)}>
                    <Download className="h-4 w-4 ml-2" />
                    הורד
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      handleDelete(selectedAsset.id)
                      setSelectedAsset(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    מחק
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
