import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFunctions, BotFunction } from '@/hooks/useFunctions';
import { useFunctionParameters, FunctionParameter } from '@/hooks/useFunctionParameters';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useActions } from '@/hooks/useActions';
import { Plus, Edit, Trash2, X, Star, StarOff, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface FunctionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botFunction?: BotFunction | null;
  mode: 'create' | 'edit';
  botId: string;
  onSuccess: () => void;
  bot?: any; // Bot info to check integration_type
}

const FunctionForm: React.FC<FunctionFormProps> = ({
  open,
  onOpenChange,
  botFunction,
  mode,
  botId,
  onSuccess,
  bot,
}) => {
  const { toast } = useToast();
  const { createFunction, updateFunction } = useFunctions();
  const { fetchParameters, createParameter, updateParameter, deleteParameter, parameters, createParametersBatch, deleteParametersBatch } = useFunctionParameters();
  const { integrations, fetchIntegrations } = useIntegrations();
  const { actions, fetchActions, loading: actionsLoading } = useActions();
  
  const [formData, setFormData] = useState({
    id: '',
    description: '',
    action: null as string | null,
  });
  const [loading, setLoading] = useState(false);
  const [parametersLoading, setParametersLoading] = useState(false);
  const [localParameters, setLocalParameters] = useState<FunctionParameter[]>([]);
  const [showParameterForm, setShowParameterForm] = useState(false);
  const [editingParameter, setEditingParameter] = useState<FunctionParameter | null>(null);
  const [parameterForm, setParameterForm] = useState({
    parameter_id: '',
    description: '',
    type: 'string' as 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array',
    format: '' as '' | 'email' | 'uri' | 'date' | 'date-time',
    required: false,
    default_value: '',
    permited_values: '',
  });

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchIntegrations();
      fetchActions();
      
      if (mode === 'edit' && botFunction) {
        setFormData({
          id: botFunction.function_id || '',
          description: botFunction.description || '',
          action: botFunction.action || null,
        });
        
        setParametersLoading(true);
        fetchParameters(botId, botFunction.function_id || '')
          .then(() => {
            // Parameters are now loaded in the hook state
            const params = parameters?.filter(p => p.function_id === botFunction.function_id) || [];
            setLocalParameters(params);
          })
          .catch((error) => {
            console.error('Error loading parameters:', error);
            toast({
              title: "Erro ao carregar parâmetros",
              description: "Não foi possível carregar os parâmetros da função.",
              variant: "destructive",
            });
          })
          .finally(() => {
            setParametersLoading(false);
          });
      } else {
        setFormData({
          id: '',
          description: '',
          action: null,
        });
        setLocalParameters([]);
      }
    }
  }, [open, mode, botFunction, fetchIntegrations, fetchActions, fetchParameters, toast]);

  const resetParameterForm = () => {
    setParameterForm({
      parameter_id: '',
      description: '',
      type: 'string',
      format: '',
      required: false,
      default_value: '',
      permited_values: '',
    });
    setEditingParameter(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id.trim()) {
      toast({
        title: "Erro de validação",
        description: "ID da função é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Erro de validação",
        description: "Descrição da função é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.action) {
      toast({
        title: "Erro de validação",
        description: "Ação é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const functionData = {
        function_id: formData.id.trim(),
        description: formData.description.trim(),
        action: formData.action,
        bot_id: botId,
      };

      let functionResult;
      if (mode === 'create') {
        functionResult = await createFunction(botId, functionData);
      } else {
        functionResult = await updateFunction(botId, botFunction?.function_id || '', functionData);
      }

      if (functionResult && localParameters.length > 0) {
        try {
          if (mode === 'edit') {
            const existingParameters = parameters?.filter(p => p.function_id === botFunction?.function_id) || [];
            const parametersToDelete = existingParameters.filter(
              existing => !localParameters.find(local => local.parameter_id === existing.parameter_id)
            );

            if (parametersToDelete.length > 0) {
              await deleteParametersBatch(botId, formData.id, parametersToDelete.map(p => p.parameter_id));
            }
          }

          const parametersWithFunctionId = localParameters.map(param => ({
            ...param,
            function_id: formData.id
          }));

          await createParametersBatch(botId, formData.id, parametersWithFunctionId);
        } catch (paramError) {
          console.error('Error saving parameters:', paramError);
          toast({
            title: "Aviso",
            description: "Função salva, mas houve erro ao salvar alguns parâmetros.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Sucesso",
        description: mode === 'create' ? "Função criada com sucesso!" : "Função atualizada com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving function:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar função.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParameterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!parameterForm.parameter_id.trim()) {
      toast({
        title: "Erro de validação",
        description: "ID do parâmetro é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const newParameter: FunctionParameter = {
      parameter_id: parameterForm.parameter_id.trim(),
      description: parameterForm.description.trim(),
      type: parameterForm.type,
      format: parameterForm.format || undefined,
      default_value: parameterForm.default_value.trim() || undefined,
      permited_values: parameterForm.permited_values.trim() || undefined,
      function_id: formData.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingParameter) {
      setLocalParameters(prev => 
        prev.map(param => 
          param.parameter_id === editingParameter.parameter_id ? newParameter : param
        )
      );
      toast({
        title: "Sucesso",
        description: "Parâmetro atualizado!",
      });
    } else {
      const exists = localParameters.find(p => p.parameter_id === newParameter.parameter_id);
      if (exists) {
        toast({
          title: "Erro",
          description: "Já existe um parâmetro com este ID.",
          variant: "destructive",
        });
        return;
      }

      setLocalParameters(prev => [...prev, newParameter]);
      toast({
        title: "Sucesso",
        description: "Parâmetro adicionado!",
      });
    }

    resetParameterForm();
    setShowParameterForm(false);
  };

  const handleEditParameter = (parameter: FunctionParameter) => {
    setParameterForm({
      parameter_id: parameter.parameter_id,
      description: parameter.description || '',
      type: parameter.type,
      format: (parameter.format as '' | 'email' | 'uri' | 'date' | 'date-time') || '',
      required: false, // Default since it's not in the interface
      default_value: parameter.default_value || '',
      permited_values: parameter.permited_values || '',
    });
    setEditingParameter(parameter);
    setShowParameterForm(true);
  };

  const handleDeleteParameter = async (parameterId: string) => {
    try {
      setLocalParameters(prev => prev.filter(p => p.parameter_id !== parameterId));
      
      toast({
        title: "Sucesso",
        description: "Parâmetro removido!",
      });
    } catch (error: any) {
      console.error('Error deleting parameter:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover parâmetro.",
        variant: "destructive",
      });
    }
  };

  const displayParameters = mode === 'edit' ? localParameters : localParameters;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Função' : 'Editar Função'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 p-1">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID da Função</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  disabled={mode === 'edit'}
                  required
                  placeholder="ex: buscar_produto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o objetivo desta função..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Ação</Label>
                <Select
                  value={formData.action || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, action: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionsLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="ml-2 text-sm">Carregando...</span>
                      </div>
                    ) : actions && actions.length > 0 ? (
                      actions.map((action) => (
                        <SelectItem key={action.id.toString()} value={action.action}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{action.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-2 text-center text-sm text-muted-foreground">
                        Nenhuma ação disponível
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Parâmetros</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetParameterForm();
                      setShowParameterForm(!showParameterForm);
                    }}
                  >
                    {showParameterForm ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Incluir Parâmetro
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showParameterForm && (
                  <form onSubmit={handleParameterSubmit} className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/20">
                    <h4 className="text-sm font-medium">
                      {editingParameter ? 'Editar Parâmetro' : 'Novo Parâmetro'}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parameter_id">ID do Parâmetro</Label>
                        <Input
                          id="parameter_id"
                          value={parameterForm.parameter_id}
                          onChange={(e) => setParameterForm(prev => ({ ...prev, parameter_id: e.target.value }))}
                          placeholder="ex: produto_id"
                          required
                          disabled={!!editingParameter}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                          value={parameterForm.type}
                          onValueChange={(value: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array') => setParameterForm(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="integer">Integer</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="array">Array</SelectItem>
                            <SelectItem value="object">Object</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="param_description">Descrição</Label>
                      <Input
                        id="param_description"
                        value={parameterForm.description}
                        onChange={(e) => setParameterForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva o parâmetro..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="format">Formato (opcional)</Label>
                        <Input
                          id="format"
                          value={parameterForm.format}
                          onChange={(e) => {
                            const value = e.target.value as '' | 'email' | 'uri' | 'date' | 'date-time';
                            setParameterForm(prev => ({ ...prev, format: value }));
                          }}
                          placeholder="ex: email, date, uuid"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="default_value">Valor Padrão (opcional)</Label>
                        <Input
                          id="default_value"
                          value={parameterForm.default_value}
                          onChange={(e) => setParameterForm(prev => ({ ...prev, default_value: e.target.value }))}
                          placeholder="Valor padrão"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="permited_values">Valores Permitidos (opcional)</Label>
                      <Input
                        id="permited_values"
                        value={parameterForm.permited_values}
                        onChange={(e) => setParameterForm(prev => ({ ...prev, permited_values: e.target.value }))}
                        placeholder="valor1, valor2, valor3"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="required"
                        checked={parameterForm.required}
                        onCheckedChange={(checked) => setParameterForm(prev => ({ ...prev, required: !!checked }))}
                      />
                      <Label htmlFor="required">Parâmetro obrigatório</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        {editingParameter ? 'Atualizar' : 'Adicionar'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetParameterForm();
                          setShowParameterForm(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}

                {parametersLoading ? (
                  <div className="flex items-center justify-center py-8 space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Carregando parâmetros...</span>
                  </div>
                ) : displayParameters.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Parâmetros Cadastrados</h4>
                    {displayParameters.map((param) => (
                      <div key={param.parameter_id} className="p-3 border rounded-lg bg-muted/30 animate-fade-in">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium">{param.parameter_id}</h5>
                              <Badge variant="secondary">{param.type}</Badge>
                              {param.format && (
                                <Badge variant="outline">{param.format}</Badge>
                              )}
                            </div>
                            {param.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {param.description}
                              </p>
                            )}
                            {param.default_value && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Padrão: {param.default_value}
                              </p>
                            )}
                            {param.permited_values && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Valores: {param.permited_values}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditParameter(param)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteParameter(param.parameter_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !showParameterForm ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum parâmetro cadastrado</p>
                    <p className="text-sm">Clique em "Incluir Parâmetro" para adicionar</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : mode === 'create' ? 'Criar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FunctionForm;