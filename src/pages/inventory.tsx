import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronRight,
  Download,
  Filter,
  PackageCheck,
  PackagePlus,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Tv,
  Wifi,
  Wrench,
} from 'lucide-react';
import {
  getListInventoryQueryKey,
  getListEquipmentAssignmentsQueryKey,
  getListClientsQueryKey,
  useListInventory,
  useListEquipmentAssignments,
  useListClients,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useAdjustInventoryStock,
  useDeleteInventoryItem,
  useAssignEquipment,
  useUpdateEquipmentStatus,
  useRemoveEquipment,
} from '@/lib/local-api';
import { Button, Field, Input, Select, Textarea, Badge, Status, Modal, PageHeader, kz, date } from '@/components/shared-ui';
import { useServiceMode } from '@/lib/service-mode';

export function InventoryPage() {
  const { mode, meta } = useServiceMode();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'stock' | 'assignments'>('stock');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalItem, setModalItem] = useState(false);
  const [modalAdjust, setModalAdjust] = useState<any>(null);
  const [modalAssign, setModalAssign] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const inventoryQuery = useListInventory({ category: categoryFilter, search, serviceMode: mode || undefined });
  const assignmentsQuery = useListEquipmentAssignments({ serviceMode: mode || undefined });
  const clientsQuery = useListClients({ serviceMode: mode || undefined });

  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const adjustStock = useAdjustInventoryStock();
  const deleteItem = useDeleteInventoryItem();
  const assignEquip = useAssignEquipment();
  const updateEquipStatus = useUpdateEquipmentStatus();
  const removeEquip = useRemoveEquipment();

  const items = inventoryQuery.data || [];
  const assignments = assignmentsQuery.data || [];
  const clients = clientsQuery.data?.items || [];

  const totalValue = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitCost || 0), 0);
  const lowStockCount = items.filter((i) => Number(i.quantity) <= Number(i.minQuantity)).length;

  // Form states
  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    category: 'equipamento',
    unit: 'unidade',
    quantity: '10',
    minQuantity: '5',
    unitCost: '15000',
    location: 'Armazém Central',
    description: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    delta: '5',
    type: 'in', // 'in' or 'out'
    reason: 'Compra / Reposição de stock',
  });

  const [assignForm, setAssignForm] = useState({
    clientId: '',
    inventoryItemId: '',
    equipmentType: 'ONU GPON',
    model: 'Huawei HG8310M',
    serialNumber: '',
    macAddress: '',
    pdoNumber: '',
    pdoPort: '',
    technician: 'Piquete Técnico',
    notes: '',
  });

  const handleSaveItem = (e: FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItem.mutate(
        { itemId: editingItem.id, data: itemForm },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
            setModalItem(false);
            setEditingItem(null);
          },
        },
      );
    } else {
      createItem.mutate(
        { data: itemForm },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
            setModalItem(false);
          },
        },
      );
    }
  };

  const handleAdjustStock = (e: FormEvent) => {
    e.preventDefault();
    if (!modalAdjust) return;
    const deltaNumber = Number(adjustForm.delta) * (adjustForm.type === 'out' ? -1 : 1);
    adjustStock.mutate(
      {
        itemId: modalAdjust.id,
        delta: deltaNumber,
        reason: adjustForm.reason,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          setModalAdjust(null);
        },
      },
    );
  };

  const handleAssignEquipment = (e: FormEvent) => {
    e.preventDefault();
    if (!assignForm.clientId) {
      alert('Por favor, seleccione um cliente.');
      return;
    }
    assignEquip.mutate(
      { data: { ...assignForm, clientId: Number(assignForm.clientId) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListEquipmentAssignmentsQueryKey() });
          qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setModalAssign(false);
        },
      },
    );
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Logística & Infraestrutura · Modo ${meta.shortName}`}
        title={`Inventário & Stock (${meta.shortName})`}
        detail={
          mode === 'fibra'
            ? 'Controlo de equipamentos ópticos, bobinas de drop FTTH, conectores SC/APC, caixas CTO/PDO e ONUs GPON.'
            : mode === 'tv'
            ? 'Controlo de materiais de TV, cabos RG6, conectores F, splitters RF, moduladores e descodificadores.'
            : 'Controlo de equipamentos ópticos, cabos coaxiais, conectores e material de rede instalado nos clientes.'
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAssignForm({
                  clientId: clients[0]?.id ? String(clients[0].id) : '',
                  inventoryItemId: items[0]?.id ? String(items[0].id) : '',
                  equipmentType: mode === 'tv' ? 'Receptor CATV / Descodificador' : 'ONU GPON',
                  model: mode === 'tv' ? 'CATV Receiver RF' : 'Huawei HG8310M',
                  serialNumber: '',
                  macAddress: '',
                  pdoNumber: '',
                  pdoPort: '',
                  technician: 'Piquete Técnico',
                  notes: '',
                });
                setModalAssign(true);
              }}
            >
              <PackageCheck size={16} /> Atribuir Equipamento
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setItemForm({
                  code: '',
                  name: '',
                  category: 'equipamento',
                  unit: 'unidade',
                  quantity: '10',
                  minQuantity: '5',
                  unitCost: '15000',
                  location: 'Armazém Central',
                  description: '',
                });
                setModalItem(true);
              }}
            >
              <Plus size={16} /> Novo Artigo
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Total de Artigos
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <Boxes size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold">{items.length}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            Categorias de TV, Fibra e Rede
          </small>
        </div>

        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Stock Baixo
            </span>
            <div
              className={`grid h-8 w-8 place-items-center rounded-lg ${
                lowStockCount > 0 ? 'bg-[#f8e1da] text-[#a24e3a]' : 'bg-[#dceee5] text-[#237052]'
              }`}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-extrabold ${lowStockCount > 0 ? 'text-[#a24e3a]' : ''}`}>
            {lowStockCount}
          </p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            {lowStockCount > 0 ? 'Requer encomenda de reposição' : 'Níveis de reserva normais'}
          </small>
        </div>

        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Valor em Armazém
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <Tag size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[hsl(var(--primary))]">{kz(totalValue)}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            Valor de custo do stock actual
          </small>
        </div>

        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Em Clientes
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[#237052]">
              <PackageCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[#237052]">{assignments.length}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            ONUs e roteadores em campo
          </small>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))]">
        <button
          onClick={() => setTab('stock')}
          className={`cursor-pointer px-5 py-3 text-sm font-bold transition border-b-2 ${
            tab === 'stock'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Artigos em Armazém ({items.length})
        </button>
        <button
          onClick={() => setTab('assignments')}
          className={`cursor-pointer px-5 py-3 text-sm font-bold transition border-b-2 ${
            tab === 'assignments'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Equipamentos Atribuídos a Clientes ({assignments.length})
        </button>
      </div>

      {tab === 'stock' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="surface rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
              />
              <Input
                placeholder="Pesquisar por código, nome ou localização…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={15} className="text-[hsl(var(--muted-foreground))]" />
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="">Todas as categorias</option>
                <option value="equipamento">Equipamentos (ONU/Router)</option>
                <option value="fibra">Fibra Óptica (Cabos/PDO/SC)</option>
                <option value="tv">TV (RG6/Divisores)</option>
                <option value="ferramenta">Ferramentas & Acessórios</option>
              </Select>
            </div>
          </div>

          {/* Stock Table */}
          <div className="surface rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="p-4">Código / Artigo</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Em Stock</th>
                    <th className="p-4">Custo Unitário</th>
                    <th className="p-4">Valor Total</th>
                    <th className="p-4">Localização</th>
                    <th className="p-4 text-right">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Nenhum artigo encontrado com os filtros actuais.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isLow = Number(item.quantity) <= Number(item.minQuantity);
                      return (
                        <tr key={item.id} className="hover:bg-[hsl(var(--secondary)/.3)] transition">
                          <td className="p-4">
                            <span className="font-mono text-xs text-[hsl(var(--muted-foreground))] block">
                              {item.code}
                            </span>
                            <b className="font-bold text-[hsl(var(--foreground))]">{item.name}</b>
                            {item.description && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 max-w-xs truncate">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge
                              tone={
                                item.category === 'fibra'
                                  ? 'good'
                                  : item.category === 'tv'
                                  ? 'warn'
                                  : item.category === 'equipamento'
                                  ? 'neutral'
                                  : 'neutral'
                              }
                            >
                              {item.category === 'fibra'
                                ? 'Fibra Óptica'
                                : item.category === 'tv'
                                ? 'TV'
                                : item.category === 'equipamento'
                                ? 'Equipamento'
                                : 'Material'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-base font-extrabold ${
                                  isLow ? 'text-[#a24e3a]' : 'text-[hsl(var(--foreground))]'
                                }`}
                              >
                                {item.quantity} {item.unit}
                              </span>
                              {isLow && (
                                <span
                                  title="Stock abaixo do mínimo!"
                                  className="grid h-5 w-5 place-items-center rounded bg-[#f8e1da] text-[#a24e3a]"
                                >
                                  <AlertTriangle size={12} />
                                </span>
                              )}
                            </div>
                            <small className="text-[11px] text-[hsl(var(--muted-foreground))] block">
                              Mínimo: {item.minQuantity} {item.unit}
                            </small>
                          </td>
                          <td className="p-4 font-mono text-xs">{kz(item.unitCost)}</td>
                          <td className="p-4 font-bold font-mono text-xs text-[hsl(var(--primary))]">
                            {kz(Number(item.quantity || 0) * Number(item.unitCost || 0))}
                          </td>
                          <td className="p-4 text-xs text-[hsl(var(--muted-foreground))]">
                            {item.location || 'Armazém'}
                          </td>
                          <td className="p-4 text-right space-x-1">
                            <button
                              title="Ajustar stock (+ Entrada / - Saída)"
                              onClick={() => {
                                setModalAdjust(item);
                                setAdjustForm({ delta: '5', type: 'in', reason: 'Compra / Reposição de stock' });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1.5 text-xs font-bold hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                            >
                              <PackagePlus size={13} /> Ajustar
                            </button>
                            <button
                              title="Editar artigo"
                              onClick={() => {
                                setEditingItem(item);
                                setItemForm({
                                  code: item.code,
                                  name: item.name,
                                  category: item.category,
                                  unit: item.unit,
                                  quantity: String(item.quantity),
                                  minQuantity: String(item.minQuantity),
                                  unitCost: String(item.unitCost),
                                  location: item.location || '',
                                  description: item.description || '',
                                });
                                setModalItem(true);
                              }}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] cursor-pointer"
                            >
                              ✎
                            </button>
                            <button
                              title="Eliminar artigo"
                              onClick={() => {
                                if (confirm(`Eliminar ${item.name}?`)) {
                                  deleteItem.mutate(
                                    { itemId: item.id },
                                    {
                                      onSuccess: () => qc.invalidateQueries({ queryKey: getListInventoryQueryKey() }),
                                    },
                                  );
                                }
                              }}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-[hsl(var(--secondary))] cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="surface rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Equipamentos em Instalações</p>
              <h3 className="text-lg font-extrabold">Parque de Dispositivos Conectados</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                ONUs, Roteadores e Conexões PDO instaladas nas casas dos clientes OSDEL.
              </p>
            </div>
            <Button
              onClick={() => {
                setAssignForm({
                  clientId: clients[0]?.id ? String(clients[0].id) : '',
                  inventoryItemId: items[0]?.id ? String(items[0].id) : '',
                  equipmentType: 'ONU GPON',
                  model: 'Huawei HG8310M',
                  serialNumber: '',
                  macAddress: '',
                  pdoNumber: '',
                  pdoPort: '',
                  technician: 'Piquete Técnico',
                  notes: '',
                });
                setModalAssign(true);
              }}
            >
              <PackageCheck size={16} /> Atribuir Equipamento
            </Button>
          </div>

          <div className="surface rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Dispositivo / Modelo</th>
                    <th className="p-4">Nº de Série (SN)</th>
                    <th className="p-4">Endereço MAC</th>
                    <th className="p-4">Conexão PDO</th>
                    <th className="p-4">Data Instalação</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Nenhum equipamento atribuído aos clientes. Clique em "Atribuir Equipamento" para registar.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((eq) => {
                      const client = clients.find((c) => c.id === eq.clientId);
                      return (
                        <tr key={eq.id} className="hover:bg-[hsl(var(--secondary)/.3)] transition">
                          <td className="p-4">
                            {client ? (
                              <Link
                                href={`/clientes/${client.id}`}
                                className="font-bold text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                              >
                                {client.fullName}
                                <ChevronRight size={13} />
                              </Link>
                            ) : (
                              <span className="font-bold">Cliente #{eq.clientId}</span>
                            )}
                            <small className="text-[11px] text-[hsl(var(--muted-foreground))] block">
                              {client?.houseCode ? `Casa: ${client.houseCode}` : client?.address || '—'}
                            </small>
                          </td>
                          <td className="p-4">
                            <b>{eq.equipmentType}</b>
                            <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                              {eq.model || 'Padrão'}
                            </small>
                          </td>
                          <td className="p-4 font-mono text-xs">{eq.serialNumber || '—'}</td>
                          <td className="p-4 font-mono text-xs">{eq.macAddress || '—'}</td>
                          <td className="p-4 text-xs">
                            <span className="font-bold text-[hsl(var(--primary))]">{eq.pdoNumber || 'PDO-01'}</span>
                            <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                              {eq.pdoPort || 'Porta Padrão'}
                            </small>
                          </td>
                          <td className="p-4 text-xs">{date(eq.installedAt)}</td>
                          <td className="p-4">
                            <Status value={eq.status} />
                          </td>
                          <td className="p-4 text-right space-x-1">
                            {eq.status === 'installed' && (
                              <button
                                title="Registar recolha do equipamento"
                                onClick={() => {
                                  if (confirm('Marcar este equipamento como recolhido da morada do cliente?')) {
                                    updateEquipStatus.mutate(
                                      { id: eq.id, status: 'recovered', notes: 'Recolhido pela equipa' },
                                      {
                                        onSuccess: () =>
                                          qc.invalidateQueries({
                                            queryKey: getListEquipmentAssignmentsQueryKey(),
                                          }),
                                      },
                                    );
                                  }
                                }}
                                className="rounded-lg border border-[hsl(var(--border))] px-2.5 py-1 text-xs font-bold hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                              >
                                Recolher
                              </button>
                            )}
                            <button
                              title="Remover registo"
                              onClick={() => {
                                if (confirm('Remover este registo de equipamento?')) {
                                  removeEquip.mutate(
                                    { id: eq.id },
                                    {
                                      onSuccess: () =>
                                        qc.invalidateQueries({
                                          queryKey: getListEquipmentAssignmentsQueryKey(),
                                        }),
                                    },
                                  );
                                }
                              }}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-[hsl(var(--secondary))] cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo/Editar Artigo */}
      {modalItem && (
        <Modal
          title={editingItem ? 'Editar Artigo de Stock' : 'Novo Artigo de Stock'}
          eyebrow="Inventário"
          onClose={() => setModalItem(false)}
        >
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código do Artigo">
                <Input
                  placeholder="Ex.: MAT-ONU-02"
                  value={itemForm.code}
                  onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                />
              </Field>
              <Field label="Categoria *">
                <Select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                >
                  <option value="equipamento">Equipamento (ONU, Roteador)</option>
                  <option value="fibra">Fibra Óptica (Cabo Drop, Conectores, PDO)</option>
                  <option value="tv">TV (Coaxial, Divisores, Conectores F)</option>
                  <option value="ferramenta">Ferramentas & Acessórios</option>
                </Select>
              </Field>
            </div>

            <Field label="Designação do Artigo *">
              <Input
                required
                placeholder="Ex.: ONU Huawei HG8310M GPON"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Unidade de Medida">
                <Select
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                >
                  <option value="unidade">Unidades (un.)</option>
                  <option value="metros">Metros (m)</option>
                  <option value="rolo">Rolos / Bobinas</option>
                  <option value="caixa">Caixas</option>
                </Select>
              </Field>

              <Field label="Quantidade em Stock">
                <Input
                  type="number"
                  required
                  min="0"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                />
              </Field>

              <Field label="Stock Mínimo (Alerta)">
                <Input
                  type="number"
                  required
                  min="0"
                  value={itemForm.minQuantity}
                  onChange={(e) => setItemForm({ ...itemForm, minQuantity: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Custo Unitário (Kz)">
                <Input
                  type="number"
                  min="0"
                  value={itemForm.unitCost}
                  onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })}
                />
              </Field>
              <Field label="Localização no Armazém">
                <Input
                  placeholder="Ex.: Prateleira B2, Gaveta 4"
                  value={itemForm.location}
                  onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Observações Técnicas">
              <Textarea
                placeholder="Especificações, compatibilidade com a rede…"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalItem(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> {editingItem ? 'Guardar Alterações' : 'Criar Artigo'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Ajuste de Stock */}
      {modalAdjust && (
        <Modal
          title={`Ajuste de Stock: ${modalAdjust.name}`}
          eyebrow="Movimento de Material"
          onClose={() => setModalAdjust(null)}
        >
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-[hsl(var(--secondary)/.6)] border border-[hsl(var(--border))] flex justify-between items-center text-sm">
              <span>Stock actual registado:</span>
              <b className="text-base font-extrabold text-[hsl(var(--primary))]">
                {modalAdjust.quantity} {modalAdjust.unit}
              </b>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de Movimento">
                <Select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                >
                  <option value="in">+ Entrada / Compra de Material</option>
                  <option value="out">- Saída / Gasto em Obra / Avaria</option>
                </Select>
              </Field>

              <Field label={`Quantidade a ${adjustForm.type === 'in' ? 'Adicionar' : 'Deduzir'}`}>
                <Input
                  type="number"
                  required
                  min="1"
                  value={adjustForm.delta}
                  onChange={(e) => setAdjustForm({ ...adjustForm, delta: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Motivo ou Justificação">
              <Input
                required
                placeholder="Ex.: Reposição de stock fornecedor, Instalação na Rua 12..."
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              />
            </Field>

            {adjustForm.type === 'in' && Number(modalAdjust.unitCost) > 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                💡 Esta entrada de {adjustForm.delta}x gerará um lançamento de despesa de{' '}
                <b>{kz(Number(modalAdjust.unitCost) * Number(adjustForm.delta))}</b> no Livro de Contas.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalAdjust(null)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Confirmar Ajuste
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Atribuir Equipamento a Cliente */}
      {modalAssign && (
        <Modal
          title="Atribuir Equipamento a Cliente"
          eyebrow="Instalação em Residência"
          onClose={() => setModalAssign(false)}
        >
          <form onSubmit={handleAssignEquipment} className="space-y-4">
            <Field label="Seleccionar Cliente *">
              <Select
                required
                value={assignForm.clientId}
                onChange={(e) => {
                  const c = clients.find((item) => item.id === Number(e.target.value));
                  setAssignForm({
                    ...assignForm,
                    clientId: e.target.value,
                    pdoNumber: c?.pdoNumber || assignForm.pdoNumber,
                  });
                }}
              >
                <option value="">-- Escolha o cliente --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.code} · {c.neighborhood || c.address})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de Equipamento">
                <Select
                  value={assignForm.equipmentType}
                  onChange={(e) => setAssignForm({ ...assignForm, equipmentType: e.target.value })}
                >
                  <option value="ONU GPON">ONU GPON (Fibra)</option>
                  <option value="Roteador Wi-Fi">Roteador Wi-Fi Gigabit</option>
                  <option value="Splitter TV">Divisor / Repartidor de TV</option>
                  <option value="Receptor TV">Box / Receptor Digital</option>
                </Select>
              </Field>

              <Field label="Deduzir do Stock de Armazém">
                <Select
                  value={assignForm.inventoryItemId}
                  onChange={(e) => setAssignForm({ ...assignForm, inventoryItemId: e.target.value })}
                >
                  <option value="">Não deduzir stock</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Disponível: {i.quantity})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nº de Série (Serial Number)">
                <Input
                  placeholder="Ex.: HWTC-882190A"
                  value={assignForm.serialNumber}
                  onChange={(e) => setAssignForm({ ...assignForm, serialNumber: e.target.value })}
                />
              </Field>
              <Field label="Endereço MAC">
                <Input
                  placeholder="Ex.: E4:C3:2A:88:21:03"
                  value={assignForm.macAddress}
                  onChange={(e) => setAssignForm({ ...assignForm, macAddress: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Caixa PDO">
                <Input
                  placeholder="Ex.: PDO-04"
                  value={assignForm.pdoNumber}
                  onChange={(e) => setAssignForm({ ...assignForm, pdoNumber: e.target.value })}
                />
              </Field>
              <Field label="Porta na PDO">
                <Input
                  placeholder="Ex.: Porta 6"
                  value={assignForm.pdoPort}
                  onChange={(e) => setAssignForm({ ...assignForm, pdoPort: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Técnico Instalador">
                <Input
                  value={assignForm.technician}
                  onChange={(e) => setAssignForm({ ...assignForm, technician: e.target.value })}
                />
              </Field>
              <Field label="Notas Adicionais">
                <Input
                  placeholder="Ex.: Cabo drop 30m, conector verde SC/APC"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalAssign(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Atribuir Equipamento
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
