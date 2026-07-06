import { useState } from 'react';
import { Plus, Trash2, Edit2, Users, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useContactLists, useCreateContactList, useUpdateContactList,
  useDeleteContactList, type ContactEntry, type ContactList,
} from '@/hooks/useInvitations';

export function ContactListsTab() {
  const { data: lists, isLoading } = useContactLists();
  const createList = useCreateContactList();
  const updateList = useUpdateContactList();
  const deleteList = useDeleteContactList();

  const [newListName, setNewListName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContacts, setEditContacts] = useState<ContactEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newOrg, setNewOrg] = useState('');

  const startEdit = (list: ContactList) => {
    setEditingId(list.id);
    setEditName(list.name);
    setEditContacts([...list.contacts]);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateList.mutate({ id: editingId, name: editName, contacts: editContacts });
    setEditingId(null);
  };

  const addContact = () => {
    if (!newEmail) return;
    setEditContacts(prev => [...prev, { name: newName, email: newEmail, organization: newOrg }]);
    setNewName(''); setNewEmail(''); setNewOrg('');
  };

  const removeContact = (idx: number) =>
    setEditContacts(prev => prev.filter((_, i) => i !== idx));

  if (isLoading) {
    return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create new list */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />New Contact List</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="List name (e.g. VIP Guests 2026)"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => { createList.mutate({ name: newListName, contacts: [] }); setNewListName(''); }}
            disabled={!newListName.trim() || createList.isPending}
          >
            Create
          </Button>
        </CardContent>
      </Card>

      {/* List of contact lists */}
      {(!lists || lists.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No contact lists yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => (
            <Card key={list.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  {editingId === list.id ? (
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm font-semibold" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{list.name}</CardTitle>
                      <Badge variant="secondary">{list.contacts.length} contacts</Badge>
                    </div>
                  )}
                  <div className="flex gap-1">
                    {editingId === list.id ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(list)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteList.mutate(list.id)}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingId === list.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-sm" />
                      <Input placeholder="Email *" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8 text-sm" />
                      <div className="flex gap-2">
                        <Input placeholder="Organization" value={newOrg} onChange={e => setNewOrg(e.target.value)} className="h-8 text-sm flex-1" />
                        <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={addContact} disabled={!newEmail}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editContacts.map((c, i) => (
                        <Badge key={i} variant="outline" className="gap-1 pr-1">
                          {c.name || c.email} {c.organization && <span className="text-muted-foreground">· {c.organization}</span>}
                          <button onClick={() => removeContact(i)}><X className="h-3 w-3 ml-1 hover:text-destructive" /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {list.contacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No contacts yet — click edit to add.</p>
                    ) : list.contacts.slice(0, 8).map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{c.name || c.email}</Badge>
                    ))}
                    {list.contacts.length > 8 && <Badge variant="outline" className="text-xs">+{list.contacts.length - 8} more</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
