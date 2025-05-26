import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, FileJson } from "lucide-react";

const ImportExport = () => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"json" | "csv">("json");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "json" | "csv" | "excel") => {
    try {
      setIsExporting(true);
      
      // Fazer a requisição para a API
      const response = await axios.get(`/api/export/${format}`, {
        responseType: 'blob', // Importante para baixar o arquivo
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY // Adicionar o cabeçalho da API Key
        }
      });
      
      // Criar um URL para o blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Criar um link temporário
      const link = document.createElement('a');
      link.href = url;
      
      // Determinar o nome do arquivo baseado no formato
      const extension = format === 'excel' ? 'xlsx' : format;
      link.setAttribute('download', `habittracker-export.${extension}`);
      
      // Adicionar o link ao DOM, clicar, e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar o URL do objeto
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Exportação concluída",
        description: `Seus dados foram exportados com sucesso no formato ${format.toUpperCase()}.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar seus dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo para importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);
      
      // Criar um FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('file', importFile);
      
      // Fazer a requisição para a API
      const response = await axios.post(`/api/import/${importType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-api-key': import.meta.env.VITE_API_KEY // Adicionar o cabeçalho da API Key
        }
      });
      
      // Mostrar estatísticas de importação
      const { stats } = response.data;
      toast({
        title: "Importação concluída",
        description: `Importados: ${stats.habits} hábitos, ${stats.dailies} tarefas diárias, ${stats.todos} tarefas.`,
        variant: "default",
      });
      
      // Limpar o arquivo selecionado
      setImportFile(null);
      
      // Recarregar a página para mostrar os dados importados
      // Idealmente, você deve atualizar apenas os dados necessários, sem reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar seus dados. Verifique o formato do arquivo e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Importar e Exportar Dados</CardTitle>
        <CardDescription>
          Faça backup dos seus dados ou restaure a partir de um arquivo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Exportar Dados</TabsTrigger>
            <TabsTrigger value="import">Importar Dados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium">Escolha um formato para exportar seus dados</h3>
                <p className="text-sm text-muted-foreground">
                  Todos os seus hábitos, tarefas diárias e tarefas serão incluídos na exportação.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <Button 
                  className="flex flex-col items-center justify-center h-24 gap-2"
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                >
                  <FileJson className="h-6 w-6" />
                  <span>JSON</span>
                  <span className="text-xs text-muted-foreground">Para sistemas</span>
                </Button>
                
                <Button 
                  className="flex flex-col items-center justify-center h-24 gap-2"
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                >
                  <Download className="h-6 w-6" />
                  <span>CSV</span>
                  <span className="text-xs text-muted-foreground">Planilhas simples</span>
                </Button>
                
                <Button 
                  className="flex flex-col items-center justify-center h-24 gap-2"
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="h-6 w-6" />
                  <span>Excel</span>
                  <span className="text-xs text-muted-foreground">Para planilhas</span>
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium">Importe seus dados de um arquivo</h3>
                <p className="text-sm text-muted-foreground">
                  Os dados importados serão adicionados aos seus dados existentes.
                </p>
              </div>
              
              <div className="grid gap-2 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant={importType === 'json' ? 'default' : 'outline'}
                    onClick={() => setImportType('json')}
                    className="h-14"
                  >
                    <FileJson className="h-5 w-5 mr-2" />
                    Arquivo JSON
                  </Button>
                  
                  <Button 
                    variant={importType === 'csv' ? 'default' : 'outline'}
                    onClick={() => setImportType('csv')}
                    className="h-14"
                  >
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    Arquivo CSV
                  </Button>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="file-upload">Selecione um arquivo:</Label>
                  <Input 
                    id="file-upload" 
                    type="file" 
                    accept={importType === 'json' ? '.json' : '.csv'} 
                    className="mt-2"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
                
                <Button 
                  className="mt-4"
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importando...' : 'Iniciar Importação'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Dica: Faça backup regularmente de seus dados para evitar perdas.
        </p>
      </CardFooter>
    </Card>
  );
};

export default ImportExport;
