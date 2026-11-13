import { CATALOG_PROCESS_MENU_TREE } from '../../shared/utils/process-tree.util';

describe('Proceso del catálogo APM', () => {
  it('mantiene disponible la ruta de Archivos APM', () => {
    expect(CATALOG_PROCESS_MENU_TREE[1].children![1].children!.map(nodo => nodo.moduleRoute)).toEqual(['/procesos/catalogo-archivos-apm']);
  });
});
